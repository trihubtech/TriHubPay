import { query } from '../db';

export interface CommissionCalculation {
  operatorCode: string;
  operatorName: string;
  serviceType: string;
  commissionType: 'PERCENT' | 'FLAT';
  faceValue: number;
  neropayMasterRate: number;
  nobleMasterRate: number;
  activeMasterRate: number;      // Higher active master margin (or flat pool)
  retailerPassDownRate: number;  // 58% share of active master margin
  adminNetMarginRate: number;    // 42% platform profit share
  retailerCommission: number;    // Exact Rupees credited/discounted to retailer
  adminCommission: number;       // Exact Rupees earned as platform net revenue
  masterCommission: number;      // Total raw Rupees received from upstream
  finalCostBilled: number;       // Net upfront debited amount from retailer wallet
  isNobleActive: boolean;
  isShopCustomized: boolean;
}

/**
 * The 58% / 42% Dynamic Split Engine
 * 
 * Rules:
 * 1. Checks if `is_noble_active` is enabled for this operator.
 * 2. Active Master Margin = `is_noble_active ? Math.max(neropay, noble) : neropay`.
 * 3. Standard Split: Customer/Retailer receives exactly 58% of the active master margin.
 *    Platform Admin retains 42% as corporate net profit.
 * 4. Flat Exceptions:
 *    - TNEB: Flat ₹2.50 Noble reward => ₹1.45 customer discount (58%), ₹1.05 Admin profit (42%).
 *    - LPG Gas: If Noble is active (₹6.00 flat pool) => ₹3.50 flat customer discount, ₹2.50 flat admin profit.
 */
export async function calculateCommission(
  retailerId: string,
  operatorCode: string,
  faceValue: number
): Promise<CommissionCalculation> {
  const normOperator = operatorCode.trim().toUpperCase();

  // 1. Fetch operator row from commission_matrix
  const matrixRes = await query(
    `SELECT 
      operator_code, operator_name, service_type, commission_type,
      neropay_master_rate, noble_master_rate, retailer_pass_down_rate,
      admin_net_margin, is_noble_active, is_active
     FROM commission_matrix 
     WHERE operator_code = $1 LIMIT 1`,
    [normOperator]
  );

  if (matrixRes.rows.length === 0) {
    throw new Error(`Operator code '${operatorCode}' is not supported or active in commission matrix.`);
  }

  const op = matrixRes.rows[0];
  if (!op.is_active) {
    throw new Error(`Operator '${op.operator_name}' is currently disabled for recharge operations.`);
  }

  const commissionType: 'PERCENT' | 'FLAT' = (op.commission_type || 'PERCENT').toUpperCase() as any;
  const isNobleActive: boolean = Boolean(op.is_noble_active);
  const neropayRate: number = parseFloat(op.neropay_master_rate || '0');
  const nobleRate: number = parseFloat(op.noble_master_rate || '0');

  // Determine active master rate based on Phase 1 vs Phase 2 activation
  let activeMasterRate: number;
  if (isNobleActive) {
    activeMasterRate = Math.max(neropayRate, nobleRate);
  } else {
    activeMasterRate = neropayRate;
  }

  let retailerCommission: number = 0;
  let adminCommission: number = 0;
  let masterCommission: number = 0;
  let retailerRatePercent: number = 0;
  let adminRatePercent: number = 0;
  let isShopCustomized = false;

  // 2. Check for individual shop custom override
  const customRes = await query(
    `SELECT custom_pass_down_rate 
     FROM user_commissions 
     WHERE user_id = $1 AND operator_code = $2 LIMIT 1`,
    [retailerId, normOperator]
  );

  // 3. SPECIAL CONDITIONS & 58% / 42% SPLIT CALCULATION
  if (normOperator === 'LPG_GAS' && isNobleActive) {
    // LPG Gas Special Condition: If Noble Web is active, bypass percentage rule and enforce flat split rule
    // Pass down a flat ₹3.50 discount to customer, leaving exactly ₹2.50 as platform net profit
    masterCommission = 6.00;
    retailerCommission = 3.50;
    adminCommission = 2.50;
    retailerRatePercent = Number(((3.50 / faceValue) * 100).toFixed(2));
    adminRatePercent = Number(((2.50 / faceValue) * 100).toFixed(2));
  } else if (normOperator === 'TNEB' || (commissionType === 'FLAT' && normOperator.includes('EB'))) {
    // TNEB / Electricity Flat Reward Split
    // Default: Noble ₹2.50 Flat reward => ₹1.45 customer discount, ₹1.05 Admin profit
    const flatPool = activeMasterRate > 0 ? activeMasterRate : 2.50;
    masterCommission = flatPool;
    retailerCommission = Number((flatPool * 0.58).toFixed(2)); // ₹1.45
    adminCommission = Number((flatPool - retailerCommission).toFixed(2)); // ₹1.05
    retailerRatePercent = Number(((retailerCommission / faceValue) * 100).toFixed(2));
    adminRatePercent = Number(((adminCommission / faceValue) * 100).toFixed(2));
  } else if (commissionType === 'FLAT') {
    // Generic Flat Reward Split
    masterCommission = activeMasterRate;
    retailerCommission = Number((activeMasterRate * 0.58).toFixed(2));
    adminCommission = Number((activeMasterRate - retailerCommission).toFixed(2));
    retailerRatePercent = Number(((retailerCommission / faceValue) * 100).toFixed(2));
    adminRatePercent = Number(((adminCommission / faceValue) * 100).toFixed(2));
  } else {
    // Standard Percentage Rule: 58% of active master margin to retailer, 42% to Admin
    let passDownPercent: number;

    if (customRes.rows.length > 0) {
      passDownPercent = parseFloat(customRes.rows[0].custom_pass_down_rate);
      isShopCustomized = true;
      if (passDownPercent > activeMasterRate) {
        passDownPercent = activeMasterRate;
      }
    } else {
      // 58% of active master rate
      passDownPercent = Number((activeMasterRate * 0.58).toFixed(2));
    }

    retailerRatePercent = passDownPercent;
    adminRatePercent = Number((activeMasterRate - retailerRatePercent).toFixed(2));

    masterCommission = Number(((faceValue * activeMasterRate) / 100).toFixed(4));
    retailerCommission = Number(((faceValue * retailerRatePercent) / 100).toFixed(4));
    adminCommission = Number((masterCommission - retailerCommission).toFixed(4));
  }

  // Upfront Net Billing: Retailer only pays face_value - retailerCommission
  const finalCostBilled = Number(Math.max(0, faceValue - retailerCommission).toFixed(4));

  return {
    operatorCode: op.operator_code,
    operatorName: op.operator_name,
    serviceType: op.service_type,
    commissionType,
    faceValue,
    neropayMasterRate: neropayRate,
    nobleMasterRate: nobleRate,
    activeMasterRate,
    retailerPassDownRate: retailerRatePercent,
    adminNetMarginRate: adminRatePercent,
    retailerCommission,
    adminCommission,
    masterCommission,
    finalCostBilled,
    isNobleActive,
    isShopCustomized
  };
}

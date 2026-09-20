import { query } from '../db';

export interface CommissionCalculation {
  operatorCode: string;
  operatorName: string;
  serviceType: string;
  faceValue: number;
  masterApiRate: number;       // e.g. 5.80%
  retailerPassDownRate: number; // e.g. 3.00% or shop custom rate
  retailerCommission: number;  // In Rupees (e.g. ₹8.97 on ₹299)
  adminCommission: number;     // In Rupees (e.g. ₹8.37 on ₹299)
  masterCommission: number;    // Total raw payout from upstream API
  finalCostBilled: number;     // Net amount debited from retailer wallet
  isShopCustomized: boolean;   // Flag indicating custom override for this shop
}

/**
 * Calculates commission split using dynamic commission blending:
 * 1. Checks for shop-specific customized commission override in user_commissions
 * 2. Falls back to global baseline commission matrix
 * 3. Enforces that retailer pass-down rate never exceeds master API payout (guaranteeing non-negative admin margin)
 */
export async function calculateCommission(
  retailerId: string,
  operatorCode: string,
  faceValue: number
): Promise<CommissionCalculation> {
  const normOperator = operatorCode.trim().toUpperCase();

  // 1. Fetch global operator matrix
  const matrixRes = await query(
    `SELECT operator_code, operator_name, service_type, master_api_rate, retailer_pass_down_rate, is_active
     FROM commission_matrix 
     WHERE operator_code = $1 LIMIT 1`,
    [normOperator]
  );

  if (matrixRes.rows.length === 0) {
    throw new Error(`Operator code '${operatorCode}' is not supported or inactive in the commission matrix.`);
  }

  const op = matrixRes.rows[0];
  if (!op.is_active) {
    throw new Error(`Operator '${op.operator_name}' is currently disabled for recharge operations.`);
  }

  const masterRate = parseFloat(op.master_api_rate);
  let retailerRate = parseFloat(op.retailer_pass_down_rate);
  let isShopCustomized = false;

  // 2. Check for shop-specific custom override
  const customRes = await query(
    `SELECT custom_pass_down_rate 
     FROM user_commissions 
     WHERE user_id = $1 AND operator_code = $2 LIMIT 1`,
    [retailerId, normOperator]
  );

  if (customRes.rows.length > 0) {
    retailerRate = parseFloat(customRes.rows[0].custom_pass_down_rate);
    isShopCustomized = true;
  }

  // Safety safeguard: Retailer pass-down can never exceed master rate (corporate financial integrity)
  if (retailerRate > masterRate) {
    console.warn(`[COMMISSION INTEGRITY WARN] Shop custom rate ${retailerRate}% exceeds master rate ${masterRate}%. Capping to master rate.`);
    retailerRate = masterRate;
  }

  // Exact monetary calculations with 4 decimal places precision
  const masterCommission = Number(((faceValue * masterRate) / 100).toFixed(4));
  const retailerCommission = Number(((faceValue * retailerRate) / 100).toFixed(4));
  const adminCommission = Number((masterCommission - retailerCommission).toFixed(4));
  
  // Upfront Net Billing: Retailer wallet only pays the discounted cost
  const finalCostBilled = Number((faceValue - retailerCommission).toFixed(4));

  return {
    operatorCode: op.operator_code,
    operatorName: op.operator_name,
    serviceType: op.service_type,
    faceValue,
    masterApiRate: masterRate,
    retailerPassDownRate: retailerRate,
    retailerCommission,
    adminCommission,
    masterCommission,
    finalCostBilled,
    isShopCustomized
  };
}

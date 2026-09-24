import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool, withTransaction, query } from '../db';
import { calculateCommission } from '../services/commissionService';
import { rechargeRouter } from '../services/rechargeRouter';
import { NeroPayClient } from '../services/upstream/neropay';
import { releaseDedupKey } from '../middleware/dedup';
import { getISTDateRange } from './adminController';
import { STANDARD_PLANS } from './operatorController';

const rechargeSchema = z.object({
  operator_code: z.string().min(2, 'Operator code is required'),
  service_type: z.enum([
    'MOBILE', 
    'DTH', 
    'ELECTRICITY', 
    'GOOGLE_PLAY', 
    'OTT_APPS', 
    'FASTAG', 
    'LPG_GAS', 
    'BROADBAND'
  ]),
  target_account_number: z.string().min(3, 'Target account / number / consumer ID is required'),
  face_value: z.number().min(10, 'Minimum recharge or bill payment amount is ₹10'),
  circle_code: z.string().optional().default('ALL_INDIA'),
  idempotency_key: z.string().optional()
});

/**
 * Controller executing ACID-compliant recharge sequence with row-level locks,
 * dynamic commission discount, two-tier upstream routing, voucher extraction, and automated failure rollback.
 */
export async function executeRecharge(req: Request, res: Response) {
  const dedupKey = (req as any).dedupKey;

  try {
    // 1. Validate Input Payload
    const parsed = rechargeSchema.safeParse(req.body);
    if (!parsed.success) {
      if (dedupKey) releaseDedupKey(dedupKey);
      return res.status(400).json({
        success: false,
        message: 'Invalid recharge parameters',
        errors: parsed.error.format()
      });
    }

    const { operator_code, service_type, target_account_number, face_value, circle_code } = parsed.data;
    const retailerId = req.user!.id;
    const idempotencyKey = parsed.data.idempotency_key || `IDEMP_${uuidv4()}`;
    const internalTxId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // 1a. MOBILE NUMBER VALIDATION (10 DIGITS, STARTING WITH 6, 7, 8, OR 9)
    if (service_type === 'MOBILE') {
      const cleanMobile = target_account_number.trim();
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        if (dedupKey) releaseDedupKey(dedupKey);
        return res.status(400).json({
          success: false,
          code: 'INVALID_MOBILE_NUMBER',
          message: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
        });
      }
    }

    // 1b. PRE-FLIGHT PLAN & WRONG AMOUNT VALIDATION
    // Strict plan catalog validation is ONLY enforced for MOBILE prepaid (where telcos reject non-standard amounts).
    // For DTH (Tata Play, Airtel DTH, Dish TV, Sun Direct, D2H), users can recharge ANY custom amount (e.g. ₹300, ₹150, ₹450)
    // matching their monthly pack/balance just like PhonePe, Paytm & Google Pay, OR select from browse plans.
    const normOp = operator_code.trim().toUpperCase();
    const opPlans = STANDARD_PLANS[normOp];
    if (service_type === 'MOBILE' && opPlans && opPlans.length > 0) {
      const validAmounts = new Set(opPlans.map(p => p.amount));
      if (!validAmounts.has(face_value)) {
        if (dedupKey) releaseDedupKey(dedupKey);
        const samplePlans = opPlans.slice(0, 6).map(p => `₹${p.amount}`).join(', ');
        return res.status(400).json({
          success: false,
          code: 'INVALID_PLAN_AMOUNT',
          message: `₹${face_value} is not a valid active plan for ${operator_code}. Available plans include ${samplePlans}, etc. Please pick an active plan from the Browse Plans tab to avoid operator rejection.`
        });
      }
    }

    // 2. Dynamic 58% / 42% Commission Calculation
    const comm = await calculateCommission(retailerId, operator_code, face_value);
    const billedCost = comm.finalCostBilled; // Net discounted amount debited upfront

    // 2b. Pre-flight Gateway Balance Verification:
    // Prevent starting orders if NeroPay's distributor wallet does not have enough balance
    const preNeroClient = new NeroPayClient();
    if (!preNeroClient.isSandbox) {
      try {
        const liveBal = await preNeroClient.checkBalance();
        if (liveBal && liveBal.main !== undefined && liveBal.main < face_value) {
          if (dedupKey) releaseDedupKey(dedupKey);
          return res.status(503).json({
            success: false,
            code: 'GATEWAY_BALANCE_LOW',
            message: `Platform gateway balance is temporarily low (Available: ₹${liveBal.main.toFixed(2)}, Required: ₹${face_value}). The transaction was prevented to protect your wallet. Please try again shortly or contact TriHubPay Admin.`
          });
        }
      } catch (balErr: any) {
        console.warn('[RECHARGE PRE-CHECK] Could not query live NeroPay balance:', balErr.message);
      }
    }

    let transactionDbId: string;
    let balanceBefore: number;
    let balanceAfter: number;

    // 3. STEP 1: ROW-LEVEL DATABASE LOCKING (SELECT ... FOR UPDATE) & ATOMIC DEBIT
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock user wallet row exclusively to prevent concurrency multi-click double deductions
      const userRes = await client.query(
        'SELECT current_balance, is_active, organization_name FROM users WHERE id = $1 FOR UPDATE',
        [retailerId]
      );

      if (userRes.rows.length === 0) {
        throw new Error('Retailer profile not found');
      }

      const user = userRes.rows[0];
      if (!user.is_active) {
        throw new Error('Retailer account is deactivated. Contact platform administrator.');
      }

      balanceBefore = parseFloat(user.current_balance);

      if (balanceBefore < billedCost) {
        await client.query('ROLLBACK');
        if (dedupKey) releaseDedupKey(dedupKey);
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_FUNDS',
          message: `Insufficient prepaid wallet balance. Required: ₹${billedCost.toFixed(2)} (after ₹${comm.retailerCommission.toFixed(2)} upfront discount), Available: ₹${balanceBefore.toFixed(2)}`
        });
      }

      balanceAfter = Number((balanceBefore - billedCost).toFixed(4));

      // Debit wallet balance
      await client.query(
        'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
        [balanceAfter, retailerId]
      );

      // Record immutable chronological ledger debit entry
      await client.query(
        `INSERT INTO wallet_ledger (
          user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          retailerId,
          billedCost,
          'DEBIT',
          balanceBefore,
          balanceAfter,
          internalTxId,
          `Order ${comm.operatorName} ${target_account_number} (Face: ₹${face_value}, Discount: ₹${comm.retailerCommission})`
        ]
      );

      // Create transaction record in PENDING status
      const txInsert = await client.query(
        `INSERT INTO transactions (
          internal_tx_id, retailer_id, service_type, operator_code, target_account_number,
          circle_code, face_value, retailer_commission, admin_commission, master_commission,
          final_cost_billed, upstream_api_used, status, idempotency_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'NEROPAY', 'PENDING', $12)
        RETURNING id`,
        [
          internalTxId,
          retailerId,
          service_type,
          comm.operatorCode,
          target_account_number,
          circle_code,
          face_value,
          comm.retailerCommission,
          comm.adminCommission,
          comm.masterCommission,
          billedCost,
          idempotencyKey
        ]
      );

      transactionDbId = txInsert.rows[0].id;
      await client.query('COMMIT');
    } catch (dbError: any) {
      await client.query('ROLLBACK');
      if (dedupKey) releaseDedupKey(dedupKey);
      throw dbError;
    } finally {
      client.release();
    }

    // 4. DYNAMIC SMART UPSTREAM ROUTING (NeroPay Primary -> Automated Failover Noble Web Studio)
    try {
      const upstreamResult = await rechargeRouter.routeRecharge({
        internalTxId,
        serviceType: service_type,
        operatorCode: comm.operatorCode,
        targetAccountNumber: target_account_number,
        circleCode: circle_code,
        faceValue: face_value
      });

      // Update transaction status and voucher codes in database
      await query(
        `UPDATE transactions SET 
          status = $1,
          upstream_api_used = $2,
          upstream_operator_ref = $3,
          upstream_response_raw = $4,
          voucher_code = $5,
          voucher_pin = $6,
          updated_at = clock_timestamp()
         WHERE id = $7`,
        [
          upstreamResult.status,
          upstreamResult.provider,
          upstreamResult.upstreamOperatorRef,
          JSON.stringify(upstreamResult.rawResponse),
          upstreamResult.voucherCode || null,
          upstreamResult.voucherPin || null,
          transactionDbId
        ]
      );

      if (dedupKey) releaseDedupKey(dedupKey);

      // STEP 2: Return clean JSON with parsed digital voucher code pin for Google Play / OTT
      return res.status(200).json({
        success: true,
        message: upstreamResult.message,
        data: {
          transaction_id: internalTxId,
          status: upstreamResult.status,
          service_type: service_type,
          operator_name: comm.operatorName,
          operator_code: comm.operatorCode,
          target_account: target_account_number,
          face_value: face_value,
          retailer_commission_earned: comm.retailerCommission,
          retailer_commission_rate: comm.retailerPassDownRate,
          final_cost_debited: billedCost,
          upstream_api_used: upstreamResult.provider,
          upstream_operator_ref: upstreamResult.upstreamOperatorRef,
          remaining_wallet_balance: balanceAfter,
          did_failover: upstreamResult.didFailover,
          // Digital Voucher details
          voucher_code: upstreamResult.voucherCode || null,
          voucher_pin: upstreamResult.voucherPin || null,
          is_digital_voucher: Boolean(upstreamResult.voucherCode),
          timestamp: new Date().toISOString()
        }
      });
    } catch (upstreamError: any) {
      console.error(`[TRANSACTION TIMEOUT/ERROR ${internalTxId}] Exception during recharge execution:`, upstreamError.message);

      // PRE-REFUND SAFETY ENGINE (FINTECH-GRADE ZERO-LOSS PROTOCOL):
      // Indian telecom operator switches often take 12-25 seconds to return the final UTR.
      // If an HTTP timeout or network drop happens, the operator may ALREADY be processing the recharge.
      // NEVER blindly refund on timeout! Refunding while upstream completes causes double loss (free recharge + free refund).
      let liveCheckStatus: 'SUCCESS' | 'PENDING' | 'FAILED' | 'UNKNOWN' = 'UNKNOWN';
      let operatorRef: string | null = null;
      let rawRescue: any = null;

      const neroClient = new NeroPayClient();
      if (!neroClient.isSandbox) {
        // Wait 3.5 seconds for telecom switch state settlement
        await new Promise(r => setTimeout(r, 3500));

        // Query status check
        try {
          console.log(`[STATUS VERIFY] Querying NeroPay live status for ${internalTxId}...`);
          const liveCheck = await neroClient.checkStatus(internalTxId);
          if (liveCheck) {
            liveCheckStatus = liveCheck.status;
            operatorRef = liveCheck.upstreamRef || null;
            rawRescue = liveCheck.rawResponse;
          }
        } catch (rescueErr: any) {
          console.warn(`[STATUS VERIFY NOTICE] Could not verify status immediately:`, rescueErr.message);
        }
      }

      // CASE 1: NeroPay confirmed SUCCESS!
      if (liveCheckStatus === 'SUCCESS') {
        console.log(`[RESCUE SUCCESS] ${internalTxId} is confirmed SUCCESS by NeroPay! Operator Ref: ${operatorRef}`);
        await query(
          `UPDATE transactions SET 
            status = 'SUCCESS',
            upstream_api_used = 'NEROPAY',
            upstream_operator_ref = $1,
            upstream_response_raw = $2,
            failure_reason = NULL,
            updated_at = clock_timestamp()
           WHERE id = $3`,
          [operatorRef, JSON.stringify(rawRescue), transactionDbId]
        );

        if (dedupKey) releaseDedupKey(dedupKey);

        return res.status(200).json({
          success: true,
          message: 'Transaction completed successfully at operator',
          data: {
            transaction_id: internalTxId,
            status: 'SUCCESS',
            service_type: service_type,
            operator_name: comm.operatorName,
            operator_code: comm.operatorCode,
            target_account: target_account_number,
            face_value: face_value,
            retailer_commission_earned: comm.retailerCommission,
            retailer_commission_rate: comm.retailerPassDownRate,
            final_cost_debited: billedCost,
            upstream_api_used: 'NEROPAY',
            upstream_operator_ref: operatorRef,
            remaining_wallet_balance: balanceAfter,
            did_failover: false,
            is_digital_voucher: false,
            timestamp: new Date().toISOString()
          }
        });
      }

      // CASE 2: NeroPay reports PENDING or request timed out / connection dropped (UNKNOWN)
      // FinTech Standard (PhonePe / Paytm): Keep wallet debited, mark as PENDING!
      // DO NOT REFUND! Let server callbacks or Admin Status Check resolve it.
      if (liveCheckStatus === 'PENDING' || liveCheckStatus === 'UNKNOWN') {
        console.log(`[RESCUE PENDING] ${internalTxId} is in-flight/pending at operator. Keeping wallet debited to prevent financial loss.`);
        await query(
          `UPDATE transactions SET 
            status = 'PENDING',
            upstream_api_used = 'NEROPAY',
            upstream_operator_ref = $1,
            upstream_response_raw = $2,
            failure_reason = 'Processing at telecom operator',
            updated_at = clock_timestamp()
           WHERE id = $3`,
          [operatorRef, JSON.stringify(rawRescue), transactionDbId]
        );

        if (dedupKey) releaseDedupKey(dedupKey);

        return res.status(200).json({
          success: true,
          message: 'Your recharge request is under process at the operator. Your wallet has been debited. Please do not re-attempt; status will update shortly.',
          data: {
            transaction_id: internalTxId,
            status: 'PENDING',
            service_type: service_type,
            operator_name: comm.operatorName,
            operator_code: comm.operatorCode,
            target_account: target_account_number,
            face_value: face_value,
            retailer_commission_earned: comm.retailerCommission,
            retailer_commission_rate: comm.retailerPassDownRate,
            final_cost_debited: billedCost,
            upstream_api_used: 'NEROPAY',
            upstream_operator_ref: operatorRef,
            remaining_wallet_balance: balanceAfter,
            did_failover: false,
            is_digital_voucher: false,
            timestamp: new Date().toISOString()
          }
        });
      }

      // CASE 3: EXPLICIT FAILURE FROM UPSTREAM
      // ONLY when NeroPay confirms FAILED, execute refund safely with idempotency check
      console.warn(`[EXPLICIT UPSTREAM FAILURE] ${internalTxId} is confirmed FAILED. Initiating safe wallet refund...`);

      let refundedBalance: number = balanceBefore;

      await withTransaction(async (rollbackClient) => {
        // Check transaction status and wallet ledger to prevent any duplicate refunds
        const ledgerCheck = await rollbackClient.query(
          `SELECT id FROM wallet_ledger WHERE reference_id = $1 AND transaction_type IN ('CREDIT', 'REFUND')`,
          [internalTxId]
        );
        if (ledgerCheck.rows.length > 0) {
          console.warn(`[REFUND GUARD] Transaction ${internalTxId} was already refunded in wallet ledger. Skipping.`);
          return;
        }

        const txCheck = await rollbackClient.query(
          'SELECT status FROM transactions WHERE id = $1',
          [transactionDbId]
        );
        if (txCheck.rows.length > 0 && (txCheck.rows[0].status === 'REFUNDED' || txCheck.rows[0].status === 'FAILED')) {
          console.warn(`[REFUND GUARD] Transaction ${internalTxId} was already finalized as ${txCheck.rows[0].status}. Skipping duplicate refund.`);
          return;
        }

        // Verify if debit actually occurred for this transaction
        const debitCheck = await rollbackClient.query(
          `SELECT id, amount, balance_before, balance_after FROM wallet_ledger WHERE reference_id = $1 AND transaction_type = 'DEBIT'`,
          [internalTxId]
        );
        const didDebit = debitCheck.rows.length > 0;

        const uLock = await rollbackClient.query(
          'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
          [retailerId]
        );
        const curBal = parseFloat(uLock.rows[0].current_balance);

        if (didDebit) {
          // MATHEMATICAL INTEGRITY INVARIANT:
          // A refund on a failed transaction CANNOT exceed balanceBefore!
          // If curBal was already at balanceBefore (i.e. debit never took effect), we do NOT add phantom money!
          refundedBalance = Number(balanceBefore.toFixed(4));

          await rollbackClient.query(
            'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
            [refundedBalance, retailerId]
          );

          await rollbackClient.query(
            `INSERT INTO wallet_ledger (
              user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              retailerId,
              billedCost,
              'CREDIT',
              curBal,
              refundedBalance,
              internalTxId,
              `AUTO-REFUND: Upstream rejected recharge on ${target_account_number} (${upstreamError.message || 'Operator rejected'})`
            ]
          );
        } else {
          console.warn(`[REFUND GUARD] No debit recorded for ${internalTxId}. Skipping ledger credit to prevent phantom balance.`);
          refundedBalance = curBal;
        }

        await rollbackClient.query(
          `UPDATE transactions SET 
            status = 'FAILED',
            failure_reason = $1,
            upstream_api_used = 'NEROPAY',
            updated_at = clock_timestamp()
           WHERE id = $2`,
          [upstreamError.message || 'Operator rejected recharge', transactionDbId]
        );
      });

      if (dedupKey) releaseDedupKey(dedupKey);

      return res.status(400).json({
        success: false,
        code: 'OPERATOR_FAILED',
        message: 'Recharge was declined by the operator. Your wallet has been 100% refunded.',
        details: upstreamError.message,
        data: {
          transaction_id: internalTxId,
          refund_status: 'REFUNDED_TO_WALLET',
          amount_refunded: billedCost,
          current_wallet_balance: refundedBalance
        }
      });
    }
  } catch (error: any) {
    if (dedupKey) releaseDedupKey(dedupKey);
    console.error('[EXECUTE RECHARGE ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during recharge processing'
    });
  }
}

/**
 * Preview commission and exact debit amount before user confirms transaction
 */
export async function previewRechargeCommission(req: Request, res: Response) {
  try {
    const operatorCode = req.query.operator_code as string;
    const faceValue = parseFloat(req.query.face_value as string);

    if (!operatorCode || isNaN(faceValue) || faceValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'operator_code and a valid positive face_value are required'
      });
    }

    const retailerId = req.user!.id;
    const comm = await calculateCommission(retailerId, operatorCode, faceValue);

    return res.json({
      success: true,
      data: {
        operator_code: comm.operatorCode,
        operator_name: comm.operatorName,
        service_type: comm.serviceType,
        commission_type: comm.commissionType,
        face_value: comm.faceValue,
        retailer_rate_percent: comm.retailerPassDownRate,
        retailer_commission: comm.retailerCommission,
        admin_net_margin: comm.adminCommission,
        final_cost_billed: comm.finalCostBilled,
        is_shop_customized: comm.isShopCustomized,
        is_noble_active: comm.isNobleActive
      }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Fetch BBPS Electricity / Utility Bill
 */
export async function fetchElectricityBill(req: Request, res: Response) {
  try {
    const { consumer_number, operator_code } = req.body;
    if (!consumer_number || !operator_code) {
      return res.status(400).json({
        success: false,
        message: 'consumer_number and operator_code are required'
      });
    }

    const bill = await rechargeRouter.fetchElectricityBill(consumer_number, operator_code);
    return res.json({
      success: true,
      data: {
        consumer_number: bill.consumerNumber,
        consumer_name: bill.consumerName,
        operator_code: bill.operatorCode,
        board_name: bill.boardName,
        bill_number: bill.billNumber,
        bill_date: bill.billDate,
        due_date: bill.dueDate,
        bill_amount: bill.billAmount,
        status: bill.status,
        provider: bill.provider
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch utility bill details'
    });
  }
}

/**
 * Browse Plans for Telecom / DTH
 */
export async function browsePlans(req: Request, res: Response) {
  try {
    const operatorCode = req.query.operator as string;
    const circle = (req.query.circle as string) || 'ALL_INDIA';

    if (!operatorCode) {
      return res.status(400).json({ success: false, message: 'operator query parameter is required' });
    }

    const plans = await rechargeRouter.fetchPlans(operatorCode, circle);
    return res.json({ success: true, data: plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get Retailer Commission Rates Table
 */
export async function getRetailerCommissionRates(req: Request, res: Response) {
  try {
    const retailerId = req.user!.id;
    const ratesRes = await query(`
      SELECT 
        cm.operator_code, 
        cm.operator_name, 
        cm.service_type, 
        cm.commission_type,
        cm.neropay_master_rate,
        cm.retailer_pass_down_rate,
        uc.custom_pass_down_rate,
        (uc.custom_pass_down_rate IS NOT NULL) as is_custom
      FROM commission_matrix cm
      LEFT JOIN user_commissions uc 
        ON uc.operator_code = cm.operator_code AND uc.user_id = $1
      WHERE cm.is_active = true AND cm.service_type IN ('MOBILE', 'DTH')
      ORDER BY cm.service_type, cm.operator_name ASC;
    `, [retailerId]);

    const formatted = ratesRes.rows.map(row => {
      let rate: number;
      const customVal = row.custom_pass_down_rate !== undefined && row.custom_pass_down_rate !== null 
        ? row.custom_pass_down_rate 
        : (row.is_custom ? row.commission_rate : undefined);

      if (customVal !== null && customVal !== undefined && !isNaN(parseFloat(String(customVal)))) {
        // Individual custom override for this shopkeeper (e.g. 3.5% or 0.3%)
        rate = parseFloat(String(customVal));
      } else {
        // Default 50% split of wholesale rate (e.g. 0.50% for Jio, 1.75% for Vi)
        const master = parseFloat(String(row.neropay_master_rate ?? 1.0));
        const true50Rate = Number((master * 0.50).toFixed(2));
        const configuredRate = parseFloat(String(row.retailer_pass_down_rate ?? 0));
        rate = (configuredRate > 0 && configuredRate <= master) ? configuredRate : true50Rate;
      }

      return {
        operator_code: row.operator_code,
        operator_name: row.operator_name,
        service_type: row.service_type,
        commission_type: row.commission_type,
        commission_rate: rate,
        retailer_pass_down_rate: rate,
        is_custom: false // Removed custom text as requested
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export const getCommissionPreview = previewRechargeCommission;
export const getMyCommissionsList = getRetailerCommissionRates;

export async function getRetailerTransactions(req: Request, res: Response) {
  try {
    const retailerId = req.user!.id;
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const txRes = await query(
      `SELECT * FROM transactions WHERE retailer_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [retailerId, limit]
    );
    return res.json({ success: true, data: txRes.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getMyInsights(req: Request, res: Response) {
  try {
    const retailerId = req.user!.id;
    const period = (req.query.period as string) || 'today';
    const isAll = period === 'all';

    const { startDate, endDate } = getISTDateRange(period);

    const txRes = await query(
      `SELECT operator_code, service_type, face_value, retailer_commission, status, created_at FROM transactions WHERE retailer_id = $1`,
      [retailerId]
    );

    let totalVolume = 0;
    let totalCommission = 0;
    let successCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let totalTxs = 0;

    const opMap: Record<string, { earnings: number; volume: number; count: number }> = {};
    const serviceEarnings: Record<string, number> = { MOBILE: 0, DTH: 0, ELECTRICITY: 0 };

    for (const t of txRes.rows) {
      if (!isAll) {
        const txTime = new Date(t.created_at).getTime();
        if (isNaN(txTime) || txTime < startDate.getTime() || txTime > endDate.getTime()) {
          continue;
        }
      }

      totalTxs++;
      const code = t.operator_code || 'OTHER';
      if (!opMap[code]) opMap[code] = { earnings: 0, volume: 0, count: 0 };

      const statusUpper = String(t.status || '').toUpperCase();
      if (statusUpper === 'SUCCESS') {
        const comm = parseFloat(String(t.retailer_commission || '0')) || 0;
        const vol = parseFloat(String(t.face_value || '0')) || 0;
        totalVolume += vol;
        totalCommission += comm;
        successCount++;

        opMap[code].earnings += comm;
        opMap[code].volume += vol;
        opMap[code].count += 1;

        const sType = t.service_type || 'MOBILE';
        serviceEarnings[sType] = (serviceEarnings[sType] || 0) + comm;
      } else if (statusUpper === 'FAILED') {
        failedCount++;
      } else {
        pendingCount++;
      }
    }

    let topOp: { operator_code: string; earnings: number; volume: number } | null = null;
    const operatorBreakdown: Array<{ operator_code: string; count: number; volume: number; commission: number }> = [];

    for (const [code, stats] of Object.entries(opMap)) {
      if (stats.volume > 0 || stats.earnings > 0 || stats.count > 0) {
        operatorBreakdown.push({
          operator_code: code,
          count: stats.count,
          volume: Number(stats.volume.toFixed(2)),
          commission: Number(stats.earnings.toFixed(2))
        });
      }
      if (!topOp || stats.earnings > topOp.earnings) {
        topOp = {
          operator_code: code,
          earnings: Number(stats.earnings.toFixed(2)),
          volume: Number(stats.volume.toFixed(2))
        };
      }
    }

    operatorBreakdown.sort((a, b) => b.volume - a.volume);

    const successRate = totalTxs > 0 ? Number(((successCount / totalTxs) * 100).toFixed(1)) : 100;
    const avgCommissionRate = totalVolume > 0 ? Number(((totalCommission / totalVolume) * 100).toFixed(2)) : 0;

    return res.json({
      success: true,
      data: {
        period,
        total_commission: Number(totalCommission.toFixed(2)),
        total_sales_volume: Number(totalVolume.toFixed(2)),
        total_transactions: totalTxs,
        successful_transactions: successCount,
        failed_transactions: failedCount,
        pending_transactions: pendingCount,
        success_rate: successRate,
        average_commission_rate: avgCommissionRate,
        top_operator: topOp,
        earnings_by_service: serviceEarnings,
        operator_breakdown: operatorBreakdown
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export const getRetailerReports = getMyInsights;

/**
 * On-Demand Live Status Checker for Retailers & Users
 * Allows checking live telecom switch status for pending/recent transactions
 */
export async function checkRetailerTransactionStatus(req: Request, res: Response) {
  try {
    const txId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const txRes = await query(
      `SELECT t.*, u.current_balance as retailer_balance
       FROM transactions t
       JOIN users u ON u.id = t.retailer_id
       WHERE (t.id::text = $1 OR t.internal_tx_id = $1)
       LIMIT 1`,
      [txId]
    );

    if (txRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const tx = txRes.rows[0];

    // Enforce ownership: retailer/consumer can only query their own transaction
    if (userRole !== 'ADMIN' && tx.retailer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied to this transaction' });
    }

    const neroClient = new NeroPayClient();
    const queryRef = tx.internal_tx_id || tx.upstream_operator_ref;
    const statusRes = await neroClient.checkStatus(queryRef);

    // CASE 1: Operator reports SUCCESS
    if (statusRes.status === 'SUCCESS' && !neroClient.isSandbox) {
      const billedCost = parseFloat(tx.final_cost_billed || tx.face_value || '0');
      let debitedBack = false;

      if ((tx.status === 'FAILED' || tx.status === 'REFUNDED') && billedCost > 0) {
        await withTransaction(async (client) => {
          const uRes = await client.query('SELECT current_balance FROM users WHERE id = $1 FOR UPDATE', [tx.retailer_id]);
          if (uRes.rows.length > 0) {
            const curBal = parseFloat(uRes.rows[0].current_balance);
            const newBal = Number((curBal - billedCost).toFixed(4));
            await client.query('UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2', [newBal, tx.retailer_id]);
            await client.query(
              `INSERT INTO wallet_ledger (
                user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
              ) VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6)`,
              [
                tx.retailer_id,
                billedCost,
                curBal,
                newBal,
                `RECON_${tx.internal_tx_id}`,
                `Reconciliation debit: Upstream confirmed SUCCESS (Ref: ${statusRes.upstreamRef || tx.upstream_operator_ref})`
              ]
            );
            debitedBack = true;
          }

          await client.query(
            `UPDATE transactions SET 
              status = 'SUCCESS',
              upstream_operator_ref = COALESCE($1, upstream_operator_ref),
              failure_reason = NULL,
              updated_at = clock_timestamp()
             WHERE id = $2`,
            [statusRes.upstreamRef || null, tx.id]
          );
        });
      } else {
        await query(
          `UPDATE transactions SET 
            status = 'SUCCESS',
            upstream_operator_ref = COALESCE($1, upstream_operator_ref),
            failure_reason = NULL,
            updated_at = clock_timestamp()
           WHERE id = $2`,
          [statusRes.upstreamRef || null, tx.id]
        );
      }

      return res.json({
        success: true,
        status: 'SUCCESS',
        message: 'Recharge was successfully completed by the telecom operator.',
        upstream_ref: statusRes.upstreamRef || tx.upstream_operator_ref,
        refunded: false
      });
    }

    // CASE 2: Operator reports FAILED
    if (statusRes.status === 'FAILED') {
      let wasRefunded = false;
      if (tx.status !== 'FAILED' && tx.status !== 'REFUNDED') {
        await withTransaction(async (client) => {
          // Idempotency check: has this transaction already been refunded?
          const creditCheck = await client.query(
            `SELECT id FROM wallet_ledger WHERE (reference_id = $1 OR reference_id = $2) AND transaction_type IN ('CREDIT', 'REFUND')`,
            [tx.internal_tx_id, `REFUND_${tx.internal_tx_id}`]
          );
          if (creditCheck.rows.length > 0) {
            console.warn(`[STATUS REFUND GUARD] Tx ${tx.internal_tx_id} already refunded. Skipping.`);
            return;
          }

          // Debit verification check: did we actually debit this transaction?
          const debitCheck = await client.query(
            `SELECT id, balance_before, balance_after, amount FROM wallet_ledger WHERE reference_id = $1 AND transaction_type = 'DEBIT'`,
            [tx.internal_tx_id]
          );

          if (debitCheck.rows.length > 0) {
            const uRes = await client.query('SELECT current_balance FROM users WHERE id = $1 FOR UPDATE', [tx.retailer_id]);
            if (uRes.rows.length > 0) {
              const curBal = parseFloat(uRes.rows[0].current_balance);
              const refundAmount = parseFloat(tx.final_cost_billed);
              const origBefore = parseFloat(debitCheck.rows[0].balance_before);
              
              // Safe restoration: cannot exceed original balance before debit
              const newBal = Number(Math.min(curBal + refundAmount, Math.max(curBal, origBefore)).toFixed(4));

              await client.query('UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2', [newBal, tx.retailer_id]);
              await client.query(`
                INSERT INTO wallet_ledger (
                  user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
                ) VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)
              `, [
                tx.retailer_id,
                refundAmount,
                curBal,
                newBal,
                `REFUND_${tx.internal_tx_id}`,
                `Live Status: Upstream failure refund for ${tx.target_account_number}`
              ]);
              wasRefunded = true;
            }
          }

          await client.query(
            `UPDATE transactions SET 
              status = 'FAILED',
              failure_reason = $1,
              updated_at = clock_timestamp()
             WHERE id = $2`,
            [statusRes.message || 'Operator declined recharge', tx.id]
          );
        });
      }

      return res.json({
        success: true,
        status: 'FAILED',
        message: wasRefunded 
          ? `Operator confirmed recharge was declined. ₹${parseFloat(tx.final_cost_billed).toFixed(2)} has been safely refunded to your wallet.`
          : 'Operator confirmed recharge was declined.',
        upstream_ref: statusRes.upstreamRef,
        refunded: wasRefunded
      });
    }

    // CASE 3: Still PENDING
    return res.json({
      success: true,
      status: 'PENDING',
      message: 'Recharge is currently processing at the telecom operator switch. Please check again in a few moments.',
      upstream_ref: statusRes.upstreamRef || tx.upstream_operator_ref,
      refunded: false
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


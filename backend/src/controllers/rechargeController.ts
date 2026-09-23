import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool, withTransaction, query } from '../db';
import { calculateCommission } from '../services/commissionService';
import { rechargeRouter } from '../services/rechargeRouter';
import { releaseDedupKey } from '../middleware/dedup';

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

    // 2. Dynamic 58% / 42% Commission Calculation
    const comm = await calculateCommission(retailerId, operator_code, face_value);
    const billedCost = comm.finalCostBilled; // Net discounted amount debited upfront

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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', 'PENDING', $12)
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
      // 5. STEP 3: AUTOMATED CLEANUP ROLLBACK SYSTEM (ACID Rollback)
      // If both NeroPay and Noble fail or time out, return the exact deducted balance to retailer wallet
      console.error(`[TRANSACTION FAILED ${internalTxId}] Initiating atomic refund rollback:`, upstreamError.message);

      let refundedBalance: number = balanceAfter;

      await withTransaction(async (rollbackClient) => {
        // Lock user wallet row again to prevent concurrency conflicts during refund
        const uLock = await rollbackClient.query(
          'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
          [retailerId]
        );
        const curBal = parseFloat(uLock.rows[0].current_balance);
        refundedBalance = Number((curBal + billedCost).toFixed(4));

        // Return exact deducted balance
        await rollbackClient.query(
          'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
          [refundedBalance, retailerId]
        );

        // Log detailed credit transaction trail in wallet ledger
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
            `AUTO-REFUND: Dual provider failure on ${internalTxId} (${upstreamError.message || 'Upstream Rejected'})`
          ]
        );

        // Mark transaction as FAILED in transactions audit table
        await rollbackClient.query(
          `UPDATE transactions SET 
            status = 'FAILED',
            failure_reason = $1,
            upstream_api_used = 'NEROPAY & NOBLE',
            updated_at = clock_timestamp()
           WHERE id = $2`,
          [upstreamError.message || 'Dual upstream providers failed', transactionDbId]
        );
      });

      if (dedupKey) releaseDedupKey(dedupKey);

      return res.status(502).json({
        success: false,
        code: 'TRANSACTION_REVERSED',
        message: 'Order failed to process through both primary and failover gateways. Your wallet has been 100% refunded.',
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
      if (row.is_custom && row.custom_pass_down_rate !== null && row.custom_pass_down_rate !== undefined) {
        // Individual custom override for this shopkeeper (e.g. 0.3%)
        rate = parseFloat(String(row.custom_pass_down_rate));
      } else {
        // Default 50% split of NeroPay wholesale rate (e.g. 0.50% for Jio, 1.75% for Vi)
        const master = parseFloat(String(row.neropay_master_rate ?? 1.0));
        const true50Rate = Number((master * 0.50).toFixed(2));
        const configuredRate = parseFloat(String(row.retailer_pass_down_rate ?? 0));
        // Retailer rate must never equal or exceed master upstream rate
        rate = (configuredRate > 0 && configuredRate < master) ? configuredRate : true50Rate;
      }

      return {
        operator_code: row.operator_code,
        operator_name: row.operator_name,
        service_type: row.service_type,
        commission_type: row.commission_type,
        commission_rate: rate,
        retailer_pass_down_rate: rate,
        is_custom: Boolean(row.is_custom)
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

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (period === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (period === 'this_week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'last_week') {
      startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === 'all') {
      startDate = new Date(0);
    } else {
      // today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }

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
      const txTime = new Date(t.created_at).getTime();
      if (txTime < startDate.getTime() || txTime > endDate.getTime()) {
        continue;
      }

      totalTxs++;
      const code = t.operator_code || 'OTHER';
      if (!opMap[code]) opMap[code] = { earnings: 0, volume: 0, count: 0 };

      if (t.status === 'SUCCESS') {
        const comm = parseFloat(t.retailer_commission || '0');
        const vol = parseFloat(t.face_value || '0');
        totalVolume += vol;
        totalCommission += comm;
        successCount++;

        opMap[code].earnings += comm;
        opMap[code].volume += vol;
        opMap[code].count += 1;

        const sType = t.service_type || 'MOBILE';
        serviceEarnings[sType] = (serviceEarnings[sType] || 0) + comm;
      } else if (t.status === 'FAILED') {
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

import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { pool, withTransaction, query } from '../db';
import { calculateCommission } from '../services/commissionService';
import { upstreamRouter } from '../services/upstream/router';
import { releaseDedupKey } from '../middleware/dedup';

const rechargeSchema = z.object({
  operator_code: z.string().min(2, 'Operator code is required'),
  service_type: z.enum(['MOBILE', 'DTH', 'ELECTRICITY']),
  target_account_number: z.string().min(3, 'Target account / number is required'),
  face_value: z.number().positive('Recharge amount must be greater than zero'),
  circle_code: z.string().optional().default('ALL_INDIA'),
  idempotency_key: z.string().optional()
});

/**
 * Controller executing ACID-compliant recharge sequence with row-level locks,
 * dynamic commission discount, two-tier upstream routing, and automated failure rollback.
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

    // 2. Dynamic Commission Calculation (Shop Custom Rate vs Matrix)
    const comm = await calculateCommission(retailerId, operator_code, face_value);
    const billedCost = comm.finalCostBilled; // Net amount debited

    let transactionDbId: string;
    let balanceBefore: number;
    let balanceAfter: number;

    // 3. ATOMIC WALLET DEDUCTION WITH ROW-LEVEL LOCKING (SELECT ... FOR UPDATE)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock user row exclusively to prevent concurrency race conditions
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
          message: `Insufficient prepaid wallet balance. Required: ₹${billedCost.toFixed(2)} (after ₹${comm.retailerCommission.toFixed(2)} commission discount), Available: ₹${balanceBefore.toFixed(2)}`
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
        ) VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6)`,
        [
          retailerId,
          billedCost,
          balanceBefore,
          balanceAfter,
          internalTxId,
          `Recharge ${comm.operatorName} ${target_account_number} (Face: ₹${face_value}, Comm: ₹${comm.retailerCommission})`
        ]
      );

      // Create transaction record in PENDING status
      const txInsert = await client.query(
        `INSERT INTO transactions (
          internal_tx_id, retailer_id, service_type, operator_code, target_account_number,
          circle_code, face_value, retailer_commission, admin_commission, master_commission,
          final_cost_billed, upstream_api_used, status, idempotency_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'NONE', 'PENDING', $12)
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

    // 4. TWO-TIER UPSTREAM ROUTING (Primary A1Topup -> Automated Failover Noble Web Studio)
    try {
      const upstreamResult = await upstreamRouter.routeRecharge({
        internalTxId,
        serviceType: service_type,
        operatorCode: comm.operatorCode,
        targetAccountNumber: target_account_number,
        circleCode: circle_code,
        faceValue: face_value
      });

      // Update transaction status to SUCCESS / PENDING
      await query(
        `UPDATE transactions SET 
          status = $1,
          upstream_api_used = $2,
          upstream_operator_ref = $3,
          upstream_response_raw = $4,
          updated_at = clock_timestamp()
         WHERE id = $5`,
        [
          upstreamResult.status,
          upstreamResult.provider,
          upstreamResult.upstreamOperatorRef,
          JSON.stringify(upstreamResult.rawResponse),
          transactionDbId
        ]
      );

      return res.status(200).json({
        success: true,
        message: upstreamResult.message,
        data: {
          transaction_id: internalTxId,
          status: upstreamResult.status,
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
          timestamp: new Date().toISOString()
        }
      });
    } catch (upstreamError: any) {
      // 5. AUTOMATED FAILURE ROLLBACK
      // If both upstream providers fail, execute atomic transaction block:
      // mark FAILED and refund exact billed cost back to retailer wallet ledger
      console.error(`[TRANSACTION FAILED ${internalTxId}] Initiating atomic refund rollback:`, upstreamError.message);

      let refundedBalance: number = balanceAfter;

      await withTransaction(async (rollbackClient) => {
        // Lock user row again
        const uLock = await rollbackClient.query(
          'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
          [retailerId]
        );
        const curBal = parseFloat(uLock.rows[0].current_balance);
        refundedBalance = Number((curBal + billedCost).toFixed(4));

        // Credit wallet back
        await rollbackClient.query(
          'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
          [refundedBalance, retailerId]
        );

        // Insert credit ledger record
        await rollbackClient.query(
          `INSERT INTO wallet_ledger (
            user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
          ) VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)`,
          [
            retailerId,
            billedCost,
            curBal,
            refundedBalance,
            internalTxId,
            `AUTO-REFUND: Dual provider failure on ${internalTxId}`
          ]
        );

        // Mark transaction as FAILED
        await rollbackClient.query(
          `UPDATE transactions SET 
            status = 'FAILED',
            failure_reason = $1,
            upstream_api_used = 'A1TOPUP & NOBLE_WEB',
            updated_at = clock_timestamp()
           WHERE id = $2`,
          [upstreamError.message || 'Dual upstream providers failed', transactionDbId]
        );
      });

      if (dedupKey) releaseDedupKey(dedupKey);

      return res.status(502).json({
        success: false,
        code: 'UPSTREAM_FAILURE_REFUNDED',
        message: 'Recharge could not be completed by upstream providers. Your wallet has been safely and automatically refunded.',
        details: {
          transaction_id: internalTxId,
          refunded_amount: billedCost,
          current_wallet_balance: refundedBalance,
          reason: upstreamError.message
        }
      });
    }
  } catch (error: any) {
    if (dedupKey) releaseDedupKey(dedupKey);
    console.error('[RECHARGE CONTROLLER FATAL]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error processing recharge'
    });
  }
}

/**
 * Fetch commission preview for a given operator and face value before checkout
 */
export async function getCommissionPreview(req: Request, res: Response) {
  try {
    const { operator_code, face_value } = req.query;
    if (!operator_code || !face_value) {
      return res.status(400).json({ success: false, message: 'operator_code and face_value are required' });
    }

    const retailerId = req.user!.id;
    const comm = await calculateCommission(retailerId, String(operator_code), parseFloat(String(face_value)));

    return res.json({
      success: true,
      data: {
        operator_code: comm.operatorCode,
        operator_name: comm.operatorName,
        face_value: comm.faceValue,
        retailer_rate_percent: comm.retailerPassDownRate,
        retailer_commission: comm.retailerCommission,
        final_cost_billed: comm.finalCostBilled,
        is_shop_customized: comm.isShopCustomized
      }
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/**
 * Fetch active transaction history for the authenticated retailer
 */
export async function getRetailerTransactions(req: Request, res: Response) {
  try {
    const retailerId = req.user!.id;
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);

    const txRes = await query(
      `SELECT 
        id, internal_tx_id, service_type, operator_code, target_account_number,
        face_value, retailer_commission, final_cost_billed, upstream_api_used,
        upstream_operator_ref, status, failure_reason, created_at
       FROM transactions
       WHERE retailer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [retailerId, limit, offset]
    );

    return res.json({
      success: true,
      data: txRes.rows
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

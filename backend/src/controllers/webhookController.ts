import { Request, Response } from 'express';
import { query, withTransaction } from '../db';

/**
 * Handles real-time status callbacks / webhooks from upstream telecom providers
 * Updates pending transaction status and initiates atomic refund if marked failed upstream.
 */
export async function handleUpstreamWebhook(req: Request, res: Response) {
  try {
    const payload = req.body;
    console.log('[UPSTREAM WEBHOOK RECEIVED]:', JSON.stringify(payload));

    // Support diverse parameter names from A1Topup, Noble Web, and standard aggregators
    const clientRefId = payload.client_ref_id || payload.client_id || payload.tx_id || payload.order_id;
    const upstreamRef = payload.operator_ref || payload.operator_id || payload.rrn || payload.api_ref;
    const incomingStatus = String(payload.status || payload.result || '').toUpperCase();
    const failureReason = payload.reason || payload.message || payload.error || 'Upstream provider callback marked failure';

    if (!clientRefId) {
      return res.status(400).json({ success: false, message: 'Missing transaction client reference ID in payload' });
    }

    // Locate transaction record
    const txRes = await query(
      `SELECT id, internal_tx_id, retailer_id, final_cost_billed, status 
       FROM transactions 
       WHERE internal_tx_id = $1 LIMIT 1`,
      [clientRefId]
    );

    if (txRes.rows.length === 0) {
      console.warn(`[WEBHOOK WARN] Transaction not found for ref ${clientRefId}`);
      return res.status(404).json({ success: false, message: 'Transaction reference not found' });
    }

    const tx = txRes.rows[0];

    // Idempotency: If already in a terminal state, acknowledge without double mutation
    if (tx.status === 'SUCCESS' || tx.status === 'REFUNDED') {
      return res.status(200).json({ success: true, message: 'Transaction already in terminal state' });
    }

    if (incomingStatus === 'SUCCESS' || incomingStatus === '00' || incomingStatus === 'OK') {
      await query(
        `UPDATE transactions SET 
          status = 'SUCCESS',
          upstream_operator_ref = COALESCE($1, upstream_operator_ref),
          upstream_response_raw = $2,
          updated_at = clock_timestamp()
         WHERE id = $3`,
        [upstreamRef, JSON.stringify(payload), tx.id]
      );
      console.log(`[WEBHOOK SUCCESS] Transaction ${clientRefId} confirmed SUCCESS.`);
      return res.status(200).json({ success: true, acknowledged: true, state: 'SUCCESS' });
    }

    if (incomingStatus === 'FAILED' || incomingStatus === 'REJECTED' || incomingStatus === 'FAIL') {
      console.warn(`[WEBHOOK FAILED] Transaction ${clientRefId} marked FAILED upstream. Processing refund...`);

      const billedAmount = parseFloat(tx.final_cost_billed);

      await withTransaction(async (client) => {
        // Lock user balance
        const uRes = await client.query(
          'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
          [tx.retailer_id]
        );
        const curBal = parseFloat(uRes.rows[0].current_balance);
        const newBal = Number((curBal + billedAmount).toFixed(4));

        // Credit wallet back
        await client.query(
          'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
          [newBal, tx.retailer_id]
        );

        // Record credit ledger entry
        await client.query(
          `INSERT INTO wallet_ledger (
            user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
          ) VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)`,
          [
            tx.retailer_id,
            billedAmount,
            curBal,
            newBal,
            clientRefId,
            `ASYNC REFUND: Webhook reported upstream failure (${failureReason})`
          ]
        );

        // Update transaction status to REFUNDED
        await client.query(
          `UPDATE transactions SET 
            status = 'REFUNDED',
            failure_reason = $1,
            upstream_response_raw = $2,
            updated_at = clock_timestamp()
           WHERE id = $3`,
          [failureReason, JSON.stringify(payload), tx.id]
        );
      });

      return res.status(200).json({ success: true, acknowledged: true, state: 'REFUNDED' });
    }

    // Default: Return ack
    return res.status(200).json({ success: true, acknowledged: true, state: 'RECEIVED' });
  } catch (error: any) {
    console.error('[WEBHOOK PROCESSOR ERROR]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

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
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            tx.retailer_id,
            billedAmount,
            'CREDIT',
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

/**
 * Dedicated NeroPay Webhook / Callback Handler
 * Officially conforms to https://docs.neropay.co.in/#callback
 * Accepts HTTP GET (and POST) queries from NeroPay servers
 */
export async function handleNeroPayWebhook(req: Request, res: Response) {
  try {
    const params = { ...req.query, ...req.body };
    console.log('[NEROPAY CALLBACK RECEIVED]:', JSON.stringify(params));

    const refId = String(params.refid || params.client_ref_id || params.tx_id || '').trim();
    const neroTxnId = String(params.txnid || '').trim();
    const operatorRef = String(params.opid || params.operatorid || '').trim();
    const rawStatus = String(params.status || '').toUpperCase().trim();
    const message = String(params.msg || params.message || '').trim();

    if (!refId && !neroTxnId) {
      console.warn('[NEROPAY CALLBACK WARN] Missing refid and txnid in callback params');
      return res.status(400).send('ERROR: Missing refid/txnid');
    }

    // Locate transaction by our internal refid or upstream txnid
    const txRes = await query(
      `SELECT id, internal_tx_id, retailer_id, final_cost_billed, status 
       FROM transactions 
       WHERE internal_tx_id = $1 OR upstream_tx_id = $2 LIMIT 1`,
      [refId, neroTxnId]
    );

    if (txRes.rows.length === 0) {
      console.warn(`[NEROPAY CALLBACK WARN] Transaction not found for refid=${refId} txnid=${neroTxnId}`);
      // Return 200 OK so NeroPay does not endlessly retry non-existent records
      return res.status(200).send('SUCCESS: Acknowledged (Not Found)');
    }

    const tx = txRes.rows[0];

    // Idempotency: If already confirmed SUCCESS, return immediately
    if (tx.status === 'SUCCESS' && rawStatus === 'SUCCESS') {
      console.log(`[NEROPAY CALLBACK IDEMPOTENT] Tx ${tx.internal_tx_id} already in terminal state SUCCESS.`);
      return res.status(200).send('SUCCESS');
    }

    if (rawStatus === 'SUCCESS') {
      const billedAmount = parseFloat(tx.final_cost_billed || '0');

      // If this transaction was previously marked FAILED or REFUNDED, recover the funds
      if ((tx.status === 'FAILED' || tx.status === 'REFUNDED') && billedAmount > 0) {
        console.log(`[NEROPAY CALLBACK RECOVERY] Tx ${tx.internal_tx_id} succeeded after being marked ${tx.status}. Recovering refunded balance...`);
        await withTransaction(async (client) => {
          const uRes = await client.query('SELECT current_balance FROM users WHERE id = $1 FOR UPDATE', [tx.retailer_id]);
          if (uRes.rows.length > 0) {
            const curBal = parseFloat(uRes.rows[0].current_balance);
            const newBal = Number((curBal - billedAmount).toFixed(4));
            await client.query('UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2', [newBal, tx.retailer_id]);
            await client.query(
              `INSERT INTO wallet_ledger (
                user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
              ) VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6)`,
              [
                tx.retailer_id,
                billedAmount,
                curBal,
                newBal,
                `RECON_${tx.internal_tx_id}`,
                `Reconciliation debit: Upstream callback confirmed SUCCESS (Ref: ${operatorRef || neroTxnId})`
              ]
            );
          }

          await client.query(
            `UPDATE transactions SET 
              status = 'SUCCESS',
              upstream_operator_ref = COALESCE($1, upstream_operator_ref),
              upstream_tx_id = COALESCE($2, upstream_tx_id),
              upstream_response_raw = $3,
              failure_reason = NULL,
              updated_at = clock_timestamp()
             WHERE id = $4`,
            [operatorRef || null, neroTxnId || null, JSON.stringify(params), tx.id]
          );
        });
      } else {
        await query(
          `UPDATE transactions SET 
            status = 'SUCCESS',
            upstream_operator_ref = COALESCE($1, upstream_operator_ref),
            upstream_tx_id = COALESCE($2, upstream_tx_id),
            upstream_response_raw = $3,
            failure_reason = NULL,
            updated_at = clock_timestamp()
           WHERE id = $4`,
          [operatorRef || null, neroTxnId || null, JSON.stringify(params), tx.id]
        );
      }

      console.log(`[NEROPAY CALLBACK SUCCESS] Transaction ${tx.internal_tx_id} confirmed SUCCESS.`);
      return res.status(200).send('SUCCESS');
    }

    if (rawStatus === 'FAILED' || rawStatus === 'REFUND') {
      if (tx.status === 'REFUNDED') {
        console.log(`[NEROPAY CALLBACK IDEMPOTENT] Tx ${tx.internal_tx_id} already refunded.`);
        return res.status(200).send('SUCCESS');
      }

      console.warn(`[NEROPAY CALLBACK FAIL/REFUND] Tx ${tx.internal_tx_id} marked ${rawStatus}. Processing refund...`);

      const billedAmount = parseFloat(tx.final_cost_billed);

      await withTransaction(async (client) => {
        // Row lock
        const uRes = await client.query(
          'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
          [tx.retailer_id]
        );
        const curBal = parseFloat(uRes.rows[0].current_balance);
        const newBal = Number((curBal + billedAmount).toFixed(4));

        // Credit balance
        await client.query(
          'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
          [newBal, tx.retailer_id]
        );

        // Record ledger
        await client.query(
          `INSERT INTO wallet_ledger (
            user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            tx.retailer_id,
            billedAmount,
            'CREDIT',
            curBal,
            newBal,
            tx.internal_tx_id,
            `NEROPAY CALLBACK REFUND: Upstream reported ${rawStatus} (${message || 'Transaction Failed'})`
          ]
        );

        // Mark transaction REFUNDED
        await client.query(
          `UPDATE transactions SET 
            status = 'REFUNDED',
            failure_reason = $1,
            upstream_response_raw = $2,
            updated_at = clock_timestamp()
           WHERE id = $3`,
          [`NeroPay ${rawStatus}: ${message || 'Failed'}`, JSON.stringify(params), tx.id]
        );
      });

      console.log(`[NEROPAY CALLBACK REFUND COMPLETE] Tx ${tx.internal_tx_id} refunded ₹${billedAmount}.`);
      return res.status(200).send('SUCCESS');
    }

    return res.status(200).send('SUCCESS');
  } catch (err: any) {
    console.error('[NEROPAY CALLBACK ERROR]:', err);
    return res.status(500).send(`ERROR: ${err.message}`);
  }
}


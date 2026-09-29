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
        // Idempotency check: has this transaction already been refunded?
        const creditCheck = await client.query(
          `SELECT id FROM wallet_ledger WHERE (reference_id = $1 OR reference_id = $2) AND transaction_type IN ('CREDIT', 'REFUND')`,
          [tx.internal_tx_id, `REFUND_${tx.internal_tx_id}`]
        );
        if (creditCheck.rows.length > 0) {
          console.warn(`[WEBHOOK REFUND GUARD] Tx ${tx.internal_tx_id} already refunded. Skipping.`);
          return;
        }

        // Debit verification check: did we actually debit this transaction?
        const debitCheck = await client.query(
          `SELECT id, balance_before, balance_after, amount FROM wallet_ledger WHERE reference_id = $1 AND transaction_type = 'DEBIT'`,
          [tx.internal_tx_id]
        );

        if (debitCheck.rows.length > 0) {
          // Lock user balance
          const uRes = await client.query(
            'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
            [tx.retailer_id]
          );
          if (uRes.rows.length > 0) {
            const curBal = parseFloat(uRes.rows[0].current_balance);
            const origBefore = parseFloat(debitCheck.rows[0].balance_before);
            const newBal = Number(Math.min(curBal + billedAmount, Math.max(curBal, origBefore)).toFixed(4));

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
          }
        }

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
        // Idempotency check: has this transaction already been refunded?
        const creditCheck = await client.query(
          `SELECT id FROM wallet_ledger WHERE (reference_id = $1 OR reference_id = $2) AND transaction_type IN ('CREDIT', 'REFUND')`,
          [tx.internal_tx_id, `REFUND_${tx.internal_tx_id}`]
        );
        if (creditCheck.rows.length > 0) {
          console.warn(`[NEROPAY CALLBACK REFUND GUARD] Tx ${tx.internal_tx_id} already refunded. Skipping.`);
          return;
        }

        // Debit verification check: did we actually debit this transaction?
        const debitCheck = await client.query(
          `SELECT id, balance_before, balance_after, amount FROM wallet_ledger WHERE reference_id = $1 AND transaction_type = 'DEBIT'`,
          [tx.internal_tx_id]
        );

        if (debitCheck.rows.length > 0) {
          // Row lock
          const uRes = await client.query(
            'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
            [tx.retailer_id]
          );
          if (uRes.rows.length > 0) {
            const curBal = parseFloat(uRes.rows[0].current_balance);
            const origBefore = parseFloat(debitCheck.rows[0].balance_before);
            const newBal = Number(Math.min(curBal + billedAmount, Math.max(curBal, origBefore)).toFixed(4));

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
          }
        }

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

/**
 * Handles automated instant UPI payment gateway / listener webhooks
 * Automatically credits user balance and writes double-entry ledger without manual admin approval
 */
export async function handleUpiPaymentWebhook(req: Request, res: Response) {
  try {
    const payload = { ...req.query, ...req.body };
    console.log('[UPI PAYMENT WEBHOOK RECEIVED]:', JSON.stringify(payload));

    const txnRef = String(payload.txn_ref || payload.client_txn_id || payload.order_id || payload.tr || '').trim();
    const cleanUtr = String(payload.utr || payload.upi_txn_id || payload.bank_ref_num || payload.rrn || '').trim();
    const rawAmount = parseFloat(payload.amount || payload.txn_amount || payload.amt || '0');
    const rawStatus = String(payload.status || payload.payment_status || payload.status_code || '').toUpperCase();

    if (!txnRef) {
      return res.status(400).json({ success: false, message: 'Missing transaction reference (txn_ref)' });
    }

    const isSuccess = ['SUCCESS', 'PAID', 'COMPLETED', '00', 'TRUE'].includes(rawStatus);
    if (!isSuccess) {
      console.warn(`[UPI WEBHOOK NOTICE] Txn ${txnRef} reported non-success status: ${rawStatus}`);
      return res.status(200).json({ success: true, acknowledged: true, note: 'Non-success status acknowledged' });
    }

    let updatedBalance = 0;
    let shopName = '';
    let creditedAmount = 0;

    await withTransaction(async (client) => {
      // 1. Locate topup record
      const topupRes = await client.query(
        'SELECT id, user_id, amount, upi_txn_id, txn_ref, status FROM wallet_topups WHERE txn_ref = $1 FOR UPDATE',
        [txnRef]
      );

      if (topupRes.rows.length === 0) {
        throw new Error(`Deposit record not found for txn_ref: ${txnRef}`);
      }

      const topup = topupRes.rows[0];
      if (topup.status === 'COMPLETED') {
        // Idempotency: Already processed
        return;
      }

      creditedAmount = rawAmount > 0 ? rawAmount : parseFloat(topup.amount);
      const utrToRecord = cleanUtr || topup.upi_txn_id || `UPI_AUTO_${Date.now()}`;

      // 2. Anti-fraud check: Ensure UTR has not been credited in another transaction
      if (cleanUtr) {
        const dupCheck = await client.query(
          `SELECT id, txn_ref FROM wallet_topups WHERE upi_txn_id = $1 AND status = 'COMPLETED' AND id != $2`,
          [cleanUtr, topup.id]
        );
        if (dupCheck.rows.length > 0) {
          throw new Error(`Fraud Lock: UTR ${cleanUtr} has already been credited in transaction ${dupCheck.rows[0].txn_ref}`);
        }
      }

      // 3. Lock user row
      const userRes = await client.query(
        'SELECT id, organization_name, current_balance FROM users WHERE id = $1 FOR UPDATE',
        [topup.user_id]
      );

      if (userRes.rows.length === 0) {
        throw new Error('User associated with topup not found');
      }

      const user = userRes.rows[0];
      shopName = user.organization_name;
      const curBal = parseFloat(user.current_balance);
      updatedBalance = Number((curBal + creditedAmount).toFixed(4));

      // 4. Update user balance
      await client.query(
        'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
        [updatedBalance, user.id]
      );

      // 5. Update Master Admin Float Vault
      const adminRes = await client.query(
        "SELECT id, current_balance FROM users WHERE role = 'ADMIN' LIMIT 1"
      );
      if (adminRes.rows.length > 0) {
        const adminUser = adminRes.rows[0];
        const adminCurBal = parseFloat(adminUser.current_balance || '0');
        const adminNewBal = Number((adminCurBal + creditedAmount).toFixed(4));
        await client.query(
          'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
          [adminNewBal, adminUser.id]
        );

        await client.query(
          `INSERT INTO wallet_ledger (
            user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
          ) VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)`,
          [
            adminUser.id,
            creditedAmount,
            adminCurBal,
            adminNewBal,
            `ADM_${topup.txn_ref}`,
            `Automated UPI Gateway Float Credit from ${shopName} (UTR: ${utrToRecord})`
          ]
        );
      }

      // 6. Record in retailer wallet_ledger (Double-entry audit log)
      await client.query(
        `INSERT INTO wallet_ledger (
          user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
        ) VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)`,
        [
          user.id,
          creditedAmount,
          curBal,
          updatedBalance,
          topup.txn_ref,
          `Automated UPI Float Load Verified (UTR: ${utrToRecord})`
        ]
      );

      // 7. Mark topup as COMPLETED
      await client.query(
        `UPDATE wallet_topups SET 
          status = 'COMPLETED',
          upi_txn_id = $1,
          admin_remarks = 'Automated UPI Gateway Verified & Credited',
          completed_at = clock_timestamp()
         WHERE id = $2`,
        [utrToRecord, topup.id]
      );
    });

    console.log(`[UPI AUTO-CREDIT SUCCESS] Credited ₹${creditedAmount} to ${shopName}. New Balance: ₹${updatedBalance}`);
    return res.status(200).json({
      success: true,
      message: `Automated UPI credit completed. ₹${creditedAmount} credited.`,
      data: {
        txn_ref: txnRef,
        credited_amount: creditedAmount,
        new_balance: updatedBalance
      }
    });
  } catch (error: any) {
    console.error('[UPI PAYMENT WEBHOOK ERROR]:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}



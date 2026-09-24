const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { query, withTransaction } = require('../dist/db');
const { NeroPayClient } = require('../dist/services/upstream/neropay');

async function reconcileAll() {
  console.log(`\n======================================================`);
  console.log(`   TRIHUBPAY AUTOMATED UPSTREAM RECONCILIATION ENGINE  `);
  console.log(`======================================================\n`);

  const syncWallets = process.argv.includes('--sync-wallets') || process.argv.includes('--fix-balances');

  try {
    const neroClient = new NeroPayClient();

    // 1. Check Live Gateway Balance
    console.log(`📡 Checking live NeroPay Distributor Balance...`);
    try {
      const bal = await neroClient.checkBalance();
      console.log(`   ✅ Live NeroPay Gateway Balance: ₹${bal.main.toFixed(2)} (Total: ₹${bal.total.toFixed(2)})\n`);
    } catch (balErr) {
      console.warn(`   ⚠️ Could not fetch NeroPay balance:`, balErr.message, `\n`);
    }

    // 2. Fetch all FAILED and PENDING transactions
    const txRes = await query(`
      SELECT id, internal_tx_id, retailer_id, user_id, target_account_number, operator_name,
             face_value, final_cost_billed, status, upstream_operator_ref, created_at
      FROM transactions
      WHERE status IN ('FAILED', 'PENDING', 'UNKNOWN')
      ORDER BY created_at ASC
    `);

    console.log(`🔍 Found ${txRes.rows.length} transaction(s) requiring upstream verification:\n`);

    let reconciledCount = 0;
    let genuineFailCount = 0;
    let pendingCount = 0;

    for (const tx of txRes.rows) {
      const txId = tx.internal_tx_id;
      const billedCost = parseFloat(tx.final_cost_billed || tx.face_value || 0);
      const userId = tx.retailer_id || tx.user_id;

      console.log(`------------------------------------------------------`);
      console.log(`Processing Tx: ${txId} (${tx.target_account_number} - ${tx.operator_name} ₹${tx.face_value})`);
      console.log(`  Local Status: ${tx.status} | Net Billed Cost: ₹${billedCost}`);

      try {
        const liveStatus = await neroClient.checkStatus(txId);
        console.log(`  NeroPay Status: ${liveStatus.status} | Ref: ${liveStatus.upstreamRef || 'N/A'}`);

        if (liveStatus.status === 'SUCCESS') {
          reconciledCount++;
          const opRef = liveStatus.upstreamRef || tx.upstream_operator_ref || `NERO_${Date.now()}`;

          // Check if wallet was previously refunded
          const refundLedgerRes = await query(`
            SELECT id, amount FROM wallet_ledger
            WHERE reference_id = $1 AND transaction_type = 'CREDIT'
          `, [txId]);

          const hadRefund = refundLedgerRes.rows.length > 0 || tx.status === 'FAILED';

          await withTransaction(async (client) => {
            // Update transaction to SUCCESS
            await client.query(`
              UPDATE transactions SET 
                status = 'SUCCESS',
                upstream_api_used = 'NEROPAY',
                upstream_operator_ref = $1,
                upstream_response_raw = $2,
                failure_reason = NULL,
                updated_at = NOW()
              WHERE internal_tx_id = $3
            `, [opRef, JSON.stringify(liveStatus.rawResponse || {}), txId]);

            // If it had been refunded, re-debit the retailer's wallet
            if (hadRefund && billedCost > 0) {
              const uRes = await client.query('SELECT current_balance, owner_name, organization_name FROM users WHERE id = $1 FOR UPDATE', [userId]);
              if (uRes.rows.length > 0) {
                const user = uRes.rows[0];
                const curBal = parseFloat(user.current_balance);
                const newBal = Number((curBal - billedCost).toFixed(4));

                await client.query('UPDATE users SET current_balance = $1, updated_at = NOW() WHERE id = $2', [newBal, userId]);

                await client.query(`
                  INSERT INTO wallet_ledger (
                    user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
                  ) VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6)
                `, [
                  userId,
                  billedCost,
                  curBal,
                  newBal,
                  `RECON_${txId}`,
                  `Reconciliation debit: Upstream confirmed SUCCESS (UTR: ${opRef})`
                ]);

                console.log(`  ✅ [RECONCILED SUCCESS] Marked SUCCESS & Re-debited ₹${billedCost} from ${user.owner_name} (Wallet: ₹${curBal} -> ₹${newBal})`);
              }
            } else {
              console.log(`  ✅ [RECONCILED SUCCESS] Marked SUCCESS with operator ref: ${opRef}`);
            }
          });
        } else if (liveStatus.status === 'FAILED') {
          genuineFailCount++;
          console.log(`  ❌ [CONFIRMED FAILED] Upstream confirmed failure: ${liveStatus.message || 'Operator rejected'}`);
          await query(`
            UPDATE transactions SET 
              status = 'FAILED',
              failure_reason = $1,
              updated_at = NOW()
            WHERE internal_tx_id = $2
          `, [liveStatus.message || 'Operator rejected', txId]);
        } else {
          pendingCount++;
          console.log(`  ⏳ [STILL PENDING] In-flight at telecom switch.`);
          await query(`
            UPDATE transactions SET 
              status = 'PENDING',
              failure_reason = 'Processing at telecom operator',
              updated_at = NOW()
            WHERE internal_tx_id = $2
          `, [txId]);
        }
      } catch (err) {
        console.warn(`  ⚠️ Error querying status for ${txId}:`, err.message);
      }

      // Small throttle between upstream calls
      await new Promise(r => setTimeout(r, 600));
    }

    console.log(`\n======================================================`);
    console.log(`  RECONCILIATION SUMMARY:`);
    console.log(`  - Reconciled to SUCCESS: ${reconciledCount}`);
    console.log(`  - Confirmed FAILED:      ${genuineFailCount}`);
    console.log(`  - Still PENDING:         ${pendingCount}`);
    console.log(`======================================================\n`);

    // 3. Mathematical Ledger Audit & Retailer Balances
    console.log(`👥 RETAILER WALLET LEDGER AUDIT:\n`);
    const allUsers = await query(`
      SELECT id, owner_name, organization_name, phone, current_balance 
      FROM users 
      WHERE role = 'RETAILER'
    `);

    for (const u of allUsers.rows) {
      // Total approved deposits
      const depRes = await query('SELECT SUM(amount) AS total_dep FROM wallet_topups WHERE user_id = $1 AND status = \'APPROVED\'', [u.id]);
      const totalDeposits = parseFloat(depRes.rows[0]?.total_dep || 0);

      // Total successful recharges debited
      const succRes = await query('SELECT SUM(final_cost_billed) AS total_billed FROM transactions WHERE (retailer_id = $1 OR user_id = $1) AND status = \'SUCCESS\'', [u.id]);
      const totalBilled = parseFloat(succRes.rows[0]?.total_billed || 0);

      const mathBalance = Number((totalDeposits - totalBilled).toFixed(4));
      const currentStored = parseFloat(u.current_balance);
      const discrepancy = Number((currentStored - mathBalance).toFixed(4));

      console.log(`Shop: ${u.organization_name} (${u.owner_name} - ${u.phone})`);
      console.log(`  - Total Approved Cash Deposits: +₹${totalDeposits.toFixed(2)}`);
      console.log(`  - Total Successful Recharges:   -₹${totalBilled.toFixed(2)}`);
      console.log(`  - True Mathematical Balance:     ₹${mathBalance.toFixed(2)}`);
      console.log(`  - Current Stored Balance:        ₹${currentStored.toFixed(2)}`);

      if (Math.abs(discrepancy) > 0.01) {
        console.log(`  ⚠️ Discrepancy Detected: ₹${discrepancy > 0 ? '+' : ''}${discrepancy.toFixed(2)} (Excess unearned funds from false refunds)`);

        if (syncWallets && process.argv.includes('--force-overwrite-deposits')) {
          await query('UPDATE users SET current_balance = $1, updated_at = NOW() WHERE id = $2', [mathBalance, u.id]);
          console.log(`  ✨ [CORRECTED] Wallet balance updated to exact ledger figure: ₹${mathBalance.toFixed(2)}`);
        }
      } else {
        console.log(`  ✅ Wallet is 100% mathematically balanced.`);
      }
      console.log(``);
    }

    console.log(`🎉 Upstream status reconciliation completed successfully!\n`);

    process.exit(0);
  } catch (globalErr) {
    console.error(`❌ Global error during reconciliation:`, globalErr.message);
    process.exit(1);
  }
}

reconcileAll();

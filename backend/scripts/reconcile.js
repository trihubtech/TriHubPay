const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { query } = require('../dist/db');

async function reconcile() {
  const txId = process.argv[2] || 'TXN_1790213298600_4738';
  const operatorRef = process.argv[3] || 'PBR2609240658420044';

  console.log(`\n======================================================`);
  console.log(`[TRIHUB RECONCILE] Processing: ${txId}`);
  console.log(`======================================================`);

  try {
    // 1. Fetch transaction
    const txRes = await query(
      'SELECT id, retailer_id, user_id, final_cost_billed, face_value, status, operator_name, target_account_number FROM transactions WHERE internal_tx_id = $1 LIMIT 1',
      [txId]
    );

    if (txRes.rows.length === 0) {
      console.error(`❌ Transaction ${txId} not found in database!`);
      process.exit(1);
    }

    const tx = txRes.rows[0];
    const userId = tx.retailer_id || tx.user_id;
    const billedCost = parseFloat(tx.final_cost_billed || tx.face_value || 0);

    console.log(`📋 Found Transaction:`);
    console.log(`   - ID: ${tx.id}`);
    console.log(`   - Target: ${tx.target_account_number} (${tx.operator_name})`);
    console.log(`   - Previous Status: ${tx.status}`);
    console.log(`   - Billed Cost: ₹${billedCost}`);
    console.log(`   - Retailer ID: ${userId}`);

    // 2. Mark transaction as SUCCESS
    await query(
      `UPDATE transactions SET 
        status = 'SUCCESS',
        upstream_api_used = 'NEROPAY',
        upstream_operator_ref = $1,
        failure_reason = NULL,
        updated_at = NOW()
       WHERE internal_tx_id = $2`,
      [operatorRef, txId]
    );
    console.log(`✅ Transaction status updated to SUCCESS with ref: ${operatorRef}`);

    // 3. If transaction was FAILED, it was refunded to the retailer's wallet.
    // Re-debit the billed cost from the retailer's balance.
    if (tx.status === 'FAILED' && billedCost > 0) {
      const userRes = await query('SELECT current_balance, wallet_balance, full_name, store_name FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        const curBal = parseFloat(user.current_balance !== undefined ? user.current_balance : (user.wallet_balance || 0));
        const newBal = Number((curBal - billedCost).toFixed(4));

        await query('UPDATE users SET current_balance = $1, wallet_balance = $1, updated_at = NOW() WHERE id = $2', [newBal, userId]);
        console.log(`💰 Retailer wallet reconciled for ${user.full_name || user.store_name || userId}:`);
        console.log(`   - Previous Balance: ₹${curBal}`);
        console.log(`   - Debited Amount:   -₹${billedCost}`);
        console.log(`   - New Balance:      ₹${newBal}`);
      }
    } else {
      console.log(`ℹ️ Wallet adjustment not needed (previous status was ${tx.status}).`);
    }

    console.log(`\n🎉 Reconciliation completed successfully!\n`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Reconciliation failed:`, err.message);
    process.exit(1);
  }
}

reconcile();

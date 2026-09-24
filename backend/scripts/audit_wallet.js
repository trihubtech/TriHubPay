const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { query } = require('../dist/db');

async function audit() {
  console.log(`\n======================================================`);
  console.log(`   TRIHUBPAY COMPREHENSIVE WALLET & AUDIT INSPECTOR   `);
  console.log(`======================================================\n`);

  const searchTarget = process.argv.find(a => !a.startsWith('--') && !a.endsWith('.js')) || 'usr-1789919612662';

  try {
    // 1. Locate user Ferose
    const usersRes = await query(`
      SELECT id, owner_name, organization_name, phone, email, current_balance, wallet_balance, role, created_at 
      FROM users 
      WHERE id = $1
         OR owner_name ILIKE $2 
         OR organization_name ILIKE $2 
         OR phone = $1
      LIMIT 5
    `, [searchTarget, `%${searchTarget}%`]);

    if (usersRes.rows.length === 0) {
      console.log('⚠️ No user matching "ferose" found in users table.');
      // Print all users to identify
      const allUsers = await query('SELECT id, owner_name, organization_name, phone, current_balance FROM users');
      console.log('Available users:');
      console.table(allUsers.rows);
      process.exit(1);
    }

    const user = usersRes.rows[0];
    const userId = user.id;

    console.log(`👤 User Details:`);
    console.log(`   - ID:           ${user.id}`);
    console.log(`   - Name:         ${user.owner_name} (${user.organization_name})`);
    console.log(`   - Phone:        ${user.phone}`);
    console.log(`   - Current Bal:  ₹${user.current_balance}`);
    console.log(`   - Wallet Bal:   ₹${user.wallet_balance || user.current_balance}`);
    console.log(`   - Created At:   ${user.created_at}`);

    // 2. Query all Topups / Deposits for this user
    console.log(`\n📥 Deposit / Top-up Requests:`);
    const topupsRes = await query(`
      SELECT id, amount, status, payment_method, upi_ref, admin_remarks, created_at, updated_at 
      FROM wallet_topups 
      WHERE user_id = $1 
      ORDER BY created_at ASC
    `, [userId]);
    if (topupsRes.rows.length === 0) {
      console.log('   (No deposit requests found)');
    } else {
      console.table(topupsRes.rows);
    }

    // 3. Query all Transactions for this user
    console.log(`\n⚡ Recharge Transactions:`);
    const txRes = await query(`
      SELECT id, internal_tx_id, target_account_number, operator_name, operator_code, face_value, 
             retailer_commission, final_cost_billed, status, upstream_api_used, upstream_operator_ref, created_at 
      FROM transactions 
      WHERE retailer_id = $1 OR user_id = $1 
      ORDER BY created_at ASC
    `, [userId]);
    if (txRes.rows.length === 0) {
      console.log('   (No transactions found)');
    } else {
      console.table(txRes.rows.map(t => ({
        tx_id: t.internal_tx_id,
        target: t.target_account_number,
        op: t.operator_code,
        face_val: t.face_value,
        comm: t.retailer_commission,
        billed: t.final_cost_billed,
        status: t.status,
        date: t.created_at
      })));
    }

    // 4. Query Wallet Ledger history
    console.log(`\n📜 Wallet Ledger History:`);
    const ledgerRes = await query(`
      SELECT id, transaction_type, amount, balance_before, balance_after, reference_id, description, created_at 
      FROM wallet_ledger 
      WHERE user_id = $1 
      ORDER BY created_at ASC
    `, [userId]);
    if (ledgerRes.rows.length === 0) {
      console.log('   (No ledger entries found)');
    } else {
      console.table(ledgerRes.rows.map(l => ({
        type: l.transaction_type,
        amount: l.amount,
        before: l.balance_before,
        after: l.balance_after,
        ref: l.reference_id,
        desc: (l.description || '').substring(0, 40),
        date: l.created_at
      })));
    }

    // 5. Mathematical Balance Calculation
    let approvedTopupTotal = 0;
    topupsRes.rows.forEach(t => {
      if (t.status === 'APPROVED') approvedTopupTotal += parseFloat(t.amount || 0);
    });

    let debitedSuccessTxTotal = 0;
    txRes.rows.forEach(t => {
      if (t.status === 'SUCCESS') {
        const billed = parseFloat(t.final_cost_billed || 0);
        debitedSuccessTxTotal += billed;
      }
    });

    console.log(`\n🧮 Summary Breakdown:`);
    console.log(`   - Approved Deposits Total:         +₹${approvedTopupTotal.toFixed(2)}`);
    console.log(`   - Successful Recharges Net Billed: -₹${debitedSuccessTxTotal.toFixed(2)}`);
    console.log(`   - Stored Wallet Balance:            ₹${user.current_balance}`);

    // If --fix-balance flag is passed, adjust balance
    const fixFlag = process.argv.find(arg => arg.startsWith('--set-balance='));
    if (fixFlag) {
      const targetBal = parseFloat(fixFlag.split('=')[1]);
      if (!isNaN(targetBal)) {
        await query('UPDATE users SET current_balance = $1, wallet_balance = $1, updated_at = NOW() WHERE id = $2', [targetBal, userId]);
        console.log(`\n✅ [BALANCE UPDATED] Set ${user.owner_name}'s wallet balance to ₹${targetBal.toFixed(2)}`);
      }
    } else {
      console.log(`\n💡 To set Ferose's wallet balance to the exact intended figure, run:`);
      console.log(`   node scripts/audit_wallet.js --set-balance=440.00\n`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Audit script error:', err.message);
    process.exit(1);
  }
}

audit();

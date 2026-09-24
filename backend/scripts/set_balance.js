const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { query } = require('../dist/db');

async function setBalance() {
  const targetUser = process.argv[2];
  const targetBalance = parseFloat(process.argv[3]);

  if (!targetUser || isNaN(targetBalance)) {
    console.log(`\nUsage: node scripts/set_balance.js <user_phone_or_name> <amount>`);
    console.log(`Examples:`);
    console.log(`  node scripts/set_balance.js ferose 301.00`);
    console.log(`  node scripts/set_balance.js sabi 301.00\n`);
    process.exit(1);
  }

  try {
    const usersRes = await query(`
      SELECT id, owner_name, organization_name, phone, current_balance 
      FROM users 
      WHERE phone = $1 
         OR owner_name ILIKE $2 
         OR organization_name ILIKE $2
      LIMIT 1
    `, [targetUser, `%${targetUser}%`]);

    if (usersRes.rows.length === 0) {
      console.error(`❌ No user found matching "${targetUser}"`);
      const allUsers = await query('SELECT id, owner_name, organization_name, phone, current_balance FROM users');
      console.log('Available users:');
      console.table(allUsers.rows);
      process.exit(1);
    }

    const user = usersRes.rows[0];
    const previousBal = parseFloat(user.current_balance);
    const newBal = Number(targetBalance.toFixed(4));

    await query('UPDATE users SET current_balance = $1, updated_at = NOW() WHERE id = $2', [newBal, user.id]);

    await query(`
      INSERT INTO wallet_ledger (
        user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      user.id,
      Math.abs(Number((newBal - previousBal).toFixed(4))),
      newBal >= previousBal ? 'CREDIT' : 'DEBIT',
      previousBal,
      newBal,
      `SET_BAL_${Date.now()}`,
      `Manual balance assignment by Admin: Set to ₹${newBal.toFixed(2)}`
    ]);

    console.log(`\n✅ [WALLET BALANCE UPDATED]`);
    console.log(`   User:             ${user.owner_name} (${user.organization_name} - ${user.phone})`);
    console.log(`   Previous Balance: ₹${previousBal.toFixed(2)}`);
    console.log(`   New Balance:      ₹${newBal.toFixed(2)}\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting balance:', err.message);
    process.exit(1);
  }
}

setBalance();

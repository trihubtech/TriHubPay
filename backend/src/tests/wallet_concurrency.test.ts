/**
 * Concurrency & ACID Integrity Test Suite
 * Validates row-level locking (SELECT ... FOR UPDATE) and anti-double-spend safeguards
 */
import { pool, query, withTransaction } from '../db';

async function runConcurrencyTest() {
  console.log('--- STARTING ACID WALLET ROW-LOCKING CONCURRENCY TEST ---');

  // Test setup: Create a temporary test retailer with exactly ₹500 balance
  const testUserId = '99999999-9999-9999-9999-999999999999';
  try {
    await query(`
      INSERT INTO users (id, organization_name, owner_name, phone, email, password_hash, role, current_balance)
      VALUES ($1, 'Concurrency Test Shop', 'Tester', '9999999999', 'test@rechargehub.in', 'hash', 'RETAILER', 500.0000)
      ON CONFLICT (id) DO UPDATE SET current_balance = 500.0000;
    `, [testUserId]);
    console.log('✅ Initial balance established: ₹500.00');
  } catch (setupErr: any) {
    console.error('Setup error in test:', setupErr.message);
    throw setupErr;
  }

  // Simulate 5 simultaneous concurrent checkout threads attempting to debit ₹290.00 each
  // With ₹500 starting balance, EXACTLY ONE transaction must succeed, and the other 4 MUST be safely rejected!
  const debitAmount = 290.00;
  const attempts = [1, 2, 3, 4, 5];

  console.log(`⚡ Firing 5 parallel checkout threads (each requesting ₹${debitAmount})...`);

  const results = await Promise.allSettled(
    attempts.map(async (threadId) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Row-level lock
        const res = await client.query(
          'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
          [testUserId]
        );
        const currentBalance = parseFloat(res.rows[0].current_balance);

        if (currentBalance < debitAmount) {
          await client.query('ROLLBACK');
          return { threadId, status: 'REJECTED_INSUFFICIENT_FUNDS', balance: currentBalance };
        }

        const newBalance = Number((currentBalance - debitAmount).toFixed(4));
        await client.query(
          'UPDATE users SET current_balance = $1 WHERE id = $2',
          [newBalance, testUserId]
        );

        await client.query(
          `INSERT INTO wallet_ledger (user_id, amount, transaction_type, balance_before, balance_after, reference_id, description)
           VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6)`,
          [testUserId, debitAmount, currentBalance, newBalance, `TEST_THREAD_${threadId}`, `Concurrency test debit thread ${threadId}`]
        );

        await client.query('COMMIT');
        return { threadId, status: 'SUCCESS', balance: newBalance };
      } catch (err: any) {
        await client.query('ROLLBACK');
        return { threadId, status: 'ERROR', error: err.message };
      } finally {
        client.release();
      }
    })
  );

  let successCount = 0;
  let rejectedCount = 0;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      console.log(`Thread ${r.value.threadId}: ${r.value.status} ${r.value.error ? `[${r.value.error}]` : ''} (Balance: ₹${r.value.balance || 'N/A'})`);
      if (r.value.status === 'SUCCESS') successCount++;
      if (r.value.status === 'REJECTED_INSUFFICIENT_FUNDS') rejectedCount++;
    }
  }

  const finalCheck = await query('SELECT current_balance FROM users WHERE id = $1', [testUserId]);
  const finalBalance = parseFloat(finalCheck.rows[0].current_balance);

  console.log(`--- TEST RESULTS ---`);
  console.log(`Total Threads: 5 | Succeeded: ${successCount} | Rejected: ${rejectedCount}`);
  console.log(`Final Database Balance: ₹${finalBalance.toFixed(2)}`);

  if (successCount === 1 && rejectedCount === 4 && finalBalance === 210.00) {
    console.log('🎉 PASS: Row-level locking strictly eliminated race conditions. Zero double-spending occurred!');
  } else {
    console.error('❌ FAIL: Race condition or double-spending detected!');
  }

  // Cleanup test user
  await query('DELETE FROM wallet_ledger WHERE user_id = $1', [testUserId]);
  await query('DELETE FROM users WHERE id = $1', [testUserId]);
  await pool.end();
}

runConcurrencyTest().catch(err => {
  console.error('Fatal concurrency test error:', err);
  process.exit(1);
});

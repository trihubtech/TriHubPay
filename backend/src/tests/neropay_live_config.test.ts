import { NeroPayClient } from '../services/upstream/neropay';
import { RechargeRouter } from '../services/rechargeRouter';
import { handleNeroPayWebhook } from '../controllers/webhookController';
import { query, pool } from '../db';
import { Request, Response } from 'express';

async function runNeroPayLiveVerification() {
  console.log('====================================================================');
  console.log('🚀 RUNNING NEROPAY OFFICIAL CONFIG & WEBHOOK VALIDATION');
  console.log('====================================================================');

  const client = new NeroPayClient();

  // 1. Verify Balance Check method exists and functions
  console.log('\n--- 1. Testing NeroPay Balance Check Method ---');
  const balanceRes = await client.checkBalance();
  console.log(`✓ NeroPay Balance response: Main=₹${balanceRes.main}, Total=₹${balanceRes.total}, Status=${balanceRes.statusCode}`);
  if (typeof balanceRes.main !== 'number') {
    throw new Error('Balance check failed to return numeric balance!');
  }

  // 2. Verify Status Check method
  console.log('\n--- 2. Testing NeroPay Status Check Method ---');
  const statusRes = await client.checkStatus('SAMPLE_REF_123');
  console.log(`✓ NeroPay Status check: Status=${statusRes.status}, Ref=${statusRes.upstreamRef}`);

  // 3. Verify Operator Execution Simulation with Voucher Output
  console.log('\n--- 3. Testing NeroPay Service Execution (Google Play & OTT) ---');
  const playRes = await client.executeRecharge({
    internalTxId: 'TX_GPLAY_TEST_1',
    serviceType: 'GOOGLE_PLAY',
    operatorCode: 'GOOGLE_PLAY',
    targetAccountNumber: '9876543210',
    faceValue: 500
  });
  console.log(`✓ Google Play Execution: Status=${playRes.status}, UpstreamRef=${playRes.upstreamRef}`);
  console.log(`✓ Voucher Code=${playRes.voucherCode}, Voucher PIN=${playRes.voucherPin}`);
  if (!playRes.voucherCode || !playRes.voucherPin) {
    throw new Error('Failed to generate or capture digital voucher!');
  }

  // 4. Verify NeroPay GET Webhook Handler with SUCCESS & REFUND flows
  console.log('\n--- 4. Testing NeroPay Webhook Callback Processing (GET) ---');
  const testUserId = '88888888-8888-8888-8888-888888888888';
  const testTxId = `TX_NERO_WH_${Date.now()}`;
  const billedAmount = 490.00;

  // Setup test user with ₹100 starting balance
  await query(`
    INSERT INTO users (id, organization_name, owner_name, phone, email, password_hash, role, current_balance)
    VALUES ($1, 'NeroPay Callback Tester', 'Callback Tester', '8888888888', 'neropay_test@trihub.in', 'hash', 'RETAILER', 100.0000)
    ON CONFLICT (id) DO UPDATE SET current_balance = 100.0000;
  `, [testUserId]);

  // Insert a test transaction in PENDING state
  await query(`
    INSERT INTO transactions (
      id, internal_tx_id, retailer_id, service_type, operator_code,
      target_account, face_value, final_cost_billed, retailer_commission_earned,
      admin_margin_earned, status, upstream_provider, upstream_api_used
    ) VALUES (
      uuid_generate_v4(), $1, $2, 'MOBILE', 'AIRTEL',
      '9876543210', 500.00, $3, 10.00,
      5.00, 'PENDING', 'NEROPAY', 'NEROPAY'
    );
  `, [testTxId, testUserId, billedAmount]);

  // Test Case 4A: Incoming NeroPay Webhook with status=REFUND (Recharge failed async)
  console.log(`⚡ Simulating NeroPay Webhook GET: status=REFUND for refid=${testTxId}`);
  
  let responseData = '';
  let responseStatusCode = 0;
  const mockReq: Partial<Request> = {
    query: {
      event: 'Transaction_Status',
      status: 'REFUND',
      rechno: '9876543210',
      amount: '500',
      txnid: 'NERO_TXN_998877',
      opid: '',
      msg: 'Operator server timeout, amount refunded',
      refid: testTxId,
      operatorcode: 'AT',
      remainbalance: '75000.00'
    },
    body: {}
  };

  const mockRes: Partial<Response> = {
    status: (code: number) => {
      responseStatusCode = code;
      return mockRes as Response;
    },
    send: (data: any) => {
      responseData = data;
      return mockRes as Response;
    }
  };

  await handleNeroPayWebhook(mockReq as Request, mockRes as Response);
  console.log(`✓ NeroPay Webhook HTTP Response: status=${responseStatusCode || 200}, body="${responseData}"`);

  // Verify that the user balance was automatically and atomically credited ₹490!
  const userCheck = await query('SELECT current_balance FROM users WHERE id = $1', [testUserId]);
  const newBal = parseFloat(userCheck.rows[0].current_balance);
  console.log(`✓ Post-Refund Wallet Balance: ₹${newBal.toFixed(2)} (Expected ₹590.00)`);

  if (newBal !== 590.00) {
    throw new Error(`Refund balance mismatch! Expected 590.00, got ${newBal}`);
  }

  // Cleanup test user and transaction
  await query('DELETE FROM wallet_ledger WHERE user_id = $1', [testUserId]);
  await query('DELETE FROM transactions WHERE internal_tx_id = $1', [testTxId]);
  await query('DELETE FROM users WHERE id = $1', [testUserId]);

  console.log('\n====================================================================');
  console.log('🎉 ALL NEROPAY LIVE INTEGRATION & WEBHOOK TESTS PASSED 100%!');
  console.log('====================================================================');
}

runNeroPayLiveVerification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal NeroPay validation error:', err);
    process.exit(1);
  });

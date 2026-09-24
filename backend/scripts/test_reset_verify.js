const { query } = require('../dist/db');
const admin = require('../dist/controllers/adminController');

async function test() {
  const targetId = '88888888-8888-8888-8888-888888888888';
  console.log('1. Checking user before reset:');
  const before = await query('SELECT id, organization_name, current_balance FROM users WHERE id = $1', [targetId]);
  console.log('Before:', before.rows[0]);

  console.log('\n2. Calling admin.resetSingleRetailerBalance:');
  const req = {
    params: { user_id: targetId },
    user: { email: 'admin@trihubpay.com' }
  };
  let responseData = null;
  const res = {
    status: (code) => ({
      json: (data) => {
        responseData = { code, data };
        console.log('Response (status):', code, data);
      }
    }),
    json: (data) => {
      responseData = { code: 200, data };
      console.log('Response (json):', data);
    }
  };

  await admin.resetSingleRetailerBalance(req, res);

  console.log('\n3. Checking user after reset:');
  const after = await query('SELECT id, organization_name, current_balance FROM users WHERE id = $1', [targetId]);
  console.log('After:', after.rows[0]);

  if (after.rows[0] && parseFloat(after.rows[0].current_balance) === 0) {
    console.log('\n✅ SUCCESS: Balance is accurately reset to ₹0.00!');
  } else {
    console.error('\n❌ FAILURE: Balance was not reset to ₹0.00!');
  }
}

test().catch(console.error);

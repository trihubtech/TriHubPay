import bcrypt from 'bcryptjs';
import { query } from '../db';
import { sendPasswordResetOtp, verifyOtpAndResetPassword } from '../controllers/authController';

async function runTests() {
  console.log('🧪 Starting Free Email OTP Password Recovery Test Suite...\n');

  // Test 1: Send OTP to admin's phone
  const req1: any = {
    body: { identifier: '6374569225' }
  };
  let res1Data: any = null;
  const res1: any = {
    status: (code: number) => ({
      json: (data: any) => {
        res1Data = { code, data };
      }
    }),
    json: (data: any) => {
      res1Data = { code: 200, data };
    }
  };

  await sendPasswordResetOtp(req1, res1);
  console.log('Test 1 (Send OTP Result):', JSON.stringify(res1Data));
  if (!res1Data || res1Data.code !== 200 || !res1Data.data.success) {
    throw new Error('Test 1 Failed: Could not send OTP');
  }
  console.log('✅ Test 1 Passed: OTP generated and masked email returned:', res1Data.data.masked_email);

  // Retrieve the generated OTP from DB
  const userRes = await query("SELECT id, email, password_hash FROM users WHERE phone = $1 LIMIT 1", ['6374569225']);
  const user = userRes.rows[0];
  const oldHash = user.password_hash;

  const otpRes = await query("SELECT otp_code, expires_at, used FROM password_reset_otps WHERE user_id = $1", [user.id]);
  const otpCode = otpRes.rows[0].otp_code;
  console.log(`🔑 Retrieved generated OTP from DB: ${otpCode}`);

  // Test 2: Try with invalid OTP
  let res2Data: any = null;
  const res2: any = {
    status: (code: number) => ({
      json: (data: any) => {
        res2Data = { code, data };
      }
    }),
    json: (data: any) => {
      res2Data = { code: 200, data };
    }
  };
  await verifyOtpAndResetPassword({
    body: { identifier: '6374569225', otp: '000000', new_password: 'NewPassword@2026' }
  } as any, res2);

  if (res2Data.code === 400 && !res2Data.data.success) {
    console.log('✅ Test 2 Passed: Invalid OTP was correctly rejected.');
  } else {
    throw new Error('Test 2 Failed: Invalid OTP was not rejected!');
  }

  // Test 3: Try with correct OTP and update password
  let res3Data: any = null;
  const res3: any = {
    status: (code: number) => ({
      json: (data: any) => {
        res3Data = { code, data };
      }
    }),
    json: (data: any) => {
      res3Data = { code: 200, data };
    }
  };
  await verifyOtpAndResetPassword({
    body: { identifier: '6374569225', otp: otpCode, new_password: 'NewPassword@2026' }
  } as any, res3);

  if (res3Data.code === 200 && res3Data.data.success) {
    console.log('✅ Test 3 Passed: Password reset successful!');
  } else {
    throw new Error('Test 3 Failed: Valid OTP reset failed!');
  }

  // Verify DB updated
  const updatedUserRes = await query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  const isNewMatch = await bcrypt.compare('NewPassword@2026', updatedUserRes.rows[0].password_hash);
  if (isNewMatch) {
    console.log('✅ Test 4 Passed: Password hash in database verified against new password.');
  } else {
    throw new Error('Test 4 Failed: New password does not match DB hash!');
  }

  // Restore original password hash
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [oldHash, user.id]);
  console.log('✅ Test 5 Passed: Restored original password hash successfully.');

  console.log('\n🎉 ALL FREE EMAIL OTP TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});

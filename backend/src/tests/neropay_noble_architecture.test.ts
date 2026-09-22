import { calculateCommission } from '../services/commissionService';
import { rechargeRouter } from '../services/rechargeRouter';
import { query } from '../db';

async function runArchitectureVerification() {
  console.log('====================================================================');
  console.log('🚀 RUNNING NEROPAY + NOBLE ARCHITECTURE & 58%/42% SPLIT VERIFICATION');
  console.log('====================================================================\n');

  const testUserId = '00000000-0000-0000-0000-000000000001';

  // -------------------------------------------------------------------------
  // TEST SUITE 1: 58% / 42% SPLIT ON ₹500 TELECOM & UTILITIES SAMPLE
  // -------------------------------------------------------------------------
  console.log('--- TEST SUITE 1: Telecom & DTH Baseline Split (Sample ₹500) ---');

  // Activate Noble (Phase 2) to test max master rate selection
  await query('UPDATE commission_matrix SET is_noble_active = true WHERE operator_code IN (\'JIO\', \'AIRTEL\', \'VI\', \'SUNDIRECT\', \'AIRTEL_DTH\', \'VIDEOCON\', \'VIDEOCON_D2H\', \'TATAPLAY\', \'TNEB\')');

  const telecomTests = [
    { code: 'JIO', face: 500, expMasterRate: 1.00, expRetailerRate: 0.58, expRetailerComm: 2.90, expAdminComm: 2.10 },
    { code: 'AIRTEL', face: 500, expMasterRate: 1.00, expRetailerRate: 0.58, expRetailerComm: 2.90, expAdminComm: 2.10 },
    { code: 'VI', face: 500, expMasterRate: 3.50, expRetailerRate: 2.03, expRetailerComm: 10.15, expAdminComm: 7.35 },
    { code: 'SUNDIRECT', face: 500, expMasterRate: 3.60, expRetailerRate: 2.09, expRetailerComm: 10.45, expAdminComm: 7.55 },
    { code: 'AIRTEL_DTH', face: 500, expMasterRate: 4.10, expRetailerRate: 2.38, expRetailerComm: 11.90, expAdminComm: 8.60 },
    { code: 'VIDEOCON_D2H', face: 500, expMasterRate: 3.60, expRetailerRate: 2.09, expRetailerComm: 10.45, expAdminComm: 7.55 },
    { code: 'TATAPLAY', face: 500, expMasterRate: 3.10, expRetailerRate: 1.80, expRetailerComm: 9.00, expAdminComm: 6.50 },
    { code: 'TNEB', face: 500, expMasterRate: 2.50, expRetailerRate: 0.29, expRetailerComm: 1.45, expAdminComm: 1.05 }
  ];

  for (const t of telecomTests) {
    const res = await calculateCommission(testUserId, t.code, t.face);
    console.log(
      `✓ [${t.code.padEnd(12)}] Face: ₹${t.face} | Active Master: ${res.activeMasterRate}% | ` +
      `Retailer: ₹${res.retailerCommission.toFixed(2)} (${res.retailerPassDownRate}%) | ` +
      `Admin: ₹${res.adminCommission.toFixed(2)} | Final Billed: ₹${res.finalCostBilled.toFixed(2)}`
    );

    if (Math.abs(res.retailerCommission - t.expRetailerComm) > 0.05) {
      throw new Error(`Mismatch on ${t.code} Retailer Commission! Expected ${t.expRetailerComm}, got ${res.retailerCommission}`);
    }
    if (Math.abs(res.adminCommission - t.expAdminComm) > 0.05) {
      throw new Error(`Mismatch on ${t.code} Admin Commission! Expected ${t.expAdminComm}, got ${res.adminCommission}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 2: 5 NEW HIGH-MARGIN CATEGORIES ON ₹1,000 SAMPLE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 2: Five New High-Margin Categories (Sample ₹1,000) ---');

  // Activate Noble for the new categories
  await query('UPDATE commission_matrix SET is_noble_active = true WHERE operator_code IN (\'GOOGLE_PLAY\', \'OTT_APPS\', \'FASTAG\', \'LPG_GAS\', \'BROADBAND\')');

  const newCatTests = [
    { code: 'GOOGLE_PLAY', face: 1000, expRetailerRate: 1.74, expRetailerComm: 17.40, expAdminComm: 12.60 },
    { code: 'OTT_APPS', face: 1000, expRetailerRate: 2.32, expRetailerComm: 23.20, expAdminComm: 16.80 },
    { code: 'FASTAG', face: 1000, expRetailerRate: 0.17, expRetailerComm: 1.70, expAdminComm: 1.30 },
    { code: 'LPG_GAS', face: 1000, expRetailerRate: 0.35, expRetailerComm: 3.50, expAdminComm: 2.50 },
    { code: 'BROADBAND', face: 1000, expRetailerRate: 0.46, expRetailerComm: 4.60, expAdminComm: 3.40 }
  ];

  for (const t of newCatTests) {
    const res = await calculateCommission(testUserId, t.code, t.face);
    console.log(
      `✓ [${t.code.padEnd(12)}] Face: ₹${t.face} | Active Master: ${res.activeMasterRate}% | ` +
      `Retailer: ₹${res.retailerCommission.toFixed(2)} (${res.retailerPassDownRate}%) | ` +
      `Admin: ₹${res.adminCommission.toFixed(2)} | Billed: ₹${res.finalCostBilled.toFixed(2)}`
    );

    if (Math.abs(res.retailerCommission - t.expRetailerComm) > 0.05) {
      throw new Error(`Mismatch on ${t.code} Retailer Commission! Expected ${t.expRetailerComm}, got ${res.retailerCommission}`);
    }
    if (Math.abs(res.adminCommission - t.expAdminComm) > 0.05) {
      throw new Error(`Mismatch on ${t.code} Admin Commission! Expected ${t.expAdminComm}, got ${res.adminCommission}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 3: DYNAMIC SMART ROUTING (PHASE 1 vs PHASE 2)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 3: Dynamic Smart Routing Engine ---');

  // Test Phase 1: is_noble_active = false => Always NeroPay primary, null fallback
  await query('UPDATE commission_matrix SET is_noble_active = false WHERE operator_code = $1', ['SUNDIRECT']);
  const routeP1 = await rechargeRouter.determineRouting('SUNDIRECT');
  console.log(`✓ Phase 1 (is_noble_active=false): Primary=${routeP1.primary}, Fallback=${routeP1.fallback}`);
  if (routeP1.primary !== 'NEROPAY' || routeP1.fallback !== null) {
    throw new Error('Phase 1 routing failed! Must direct 100% to NeroPay with null fallback');
  }

  // Test Phase 2: is_noble_active = true => Higher rate gets Primary
  // For SUN_DIRECT: NeroPay = 2.80% | Noble = 3.60% => Noble must be PRIMARY, NeroPay FALLBACK
  await query('UPDATE commission_matrix SET is_noble_active = true WHERE operator_code = $1', ['SUNDIRECT']);
  const routeP2 = await rechargeRouter.determineRouting('SUNDIRECT');
  console.log(`✓ Phase 2 (is_noble_active=true, Noble 3.60% > Nero 2.80%): Primary=${routeP2.primary}, Fallback=${routeP2.fallback}`);
  if (routeP2.primary !== 'NOBLE' || routeP2.fallback !== 'NEROPAY') {
    throw new Error('Phase 2 routing failed! Noble must be primary when it offers higher master rate');
  }

  // For AIRTEL_DTH: NeroPay = 4.10% | Noble = 3.50% => NeroPay must be PRIMARY, Noble FALLBACK
  const routeAirtelDth = await rechargeRouter.determineRouting('AIRTEL_DTH');
  console.log(`✓ Phase 2 (NeroPay 4.10% > Noble 3.50%): Primary=${routeAirtelDth.primary}, Fallback=${routeAirtelDth.fallback}`);
  if (routeAirtelDth.primary !== 'NEROPAY' || routeAirtelDth.fallback !== 'NOBLE') {
    throw new Error('Phase 2 routing failed! NeroPay must be primary when it offers higher master rate');
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 4: DIGITAL VOUCHER CODE & PIN EXTRACTION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 4: Digital Voucher Code & PIN Generation ---');
  const voucherRes = await rechargeRouter.routeRecharge({
    internalTxId: `TX_VOUCHER_${Date.now()}`,
    serviceType: 'GOOGLE_PLAY',
    operatorCode: 'GOOGLE_PLAY',
    targetAccountNumber: '9876543210',
    faceValue: 500
  });

  console.log(`✓ Google Play Execution: Status=${voucherRes.status}, Provider=${voucherRes.provider}`);
  console.log(`✓ Extracted Voucher Code: ${voucherRes.voucherCode}`);
  console.log(`✓ Extracted Voucher PIN: ${voucherRes.voucherPin}`);

  if (!voucherRes.voucherCode) {
    throw new Error('Digital voucher code pin was not generated or captured!');
  }

  console.log('\n====================================================================');
  console.log('🎉 ALL ARCHITECTURE, COMMISSION & SMART FAILOVER TESTS PASSED 100%!');
  console.log('====================================================================');
}

runArchitectureVerification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  });

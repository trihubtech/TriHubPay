import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { deduplicateRecharge } from '../middleware/dedup';
import { verifyWebhookHmac } from '../middleware/hmac';

// Controllers
import * as authController from '../controllers/authController';
import * as walletController from '../controllers/walletController';
import * as rechargeController from '../controllers/rechargeController';
import * as adminController from '../controllers/adminController';
import * as operatorController from '../controllers/operatorController';
import * as webhookController from '../controllers/webhookController';

export const router = Router();

// -------------------------------------------------------------
// 1. PUBLIC & AUTH ROUTES
// -------------------------------------------------------------
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.registerRetailer);
router.get('/auth/me', authenticate, authController.getMe);

// -------------------------------------------------------------
// 2. OPERATORS & PLANS DIRECTORY
// -------------------------------------------------------------
router.get('/operators', operatorController.getOperatorsList);
router.get('/operators/:operator_code/plans', operatorController.getPlansForOperator);
router.post('/bill/fetch', authenticate, operatorController.fetchElectricityBill);

// -------------------------------------------------------------
// 3. RETAILER WALLET & PREPAID FUNDING
// -------------------------------------------------------------
router.get('/wallet/balance', authenticate, walletController.getBalance);
router.post('/wallet/topup/upi', authenticate, walletController.generateUpiTopup);
router.post('/wallet/topup/submit', authenticate, walletController.submitUpiDeposit);
router.post('/wallet/topup/confirm', authenticate, walletController.confirmUpiTopup);
router.get('/wallet/ledger', authenticate, walletController.getLedgerHistory);

// -------------------------------------------------------------
// 4. RECHARGE TRANSACTIONS (ACID DEDUCTION + TWO-TIER ROUTING)
// -------------------------------------------------------------
router.post(
  '/recharge/execute',
  authenticate,
  requireRole(['RETAILER', 'ADMIN']),
  deduplicateRecharge, // 30-second sliding-window duplicate suppression
  rechargeController.executeRecharge
);
router.get('/recharge/preview', authenticate, rechargeController.getCommissionPreview);
router.get('/recharge/transactions', authenticate, rechargeController.getRetailerTransactions);

// -------------------------------------------------------------
// 5. PLATFORM ADMIN CONTROL PANEL
// -------------------------------------------------------------
router.get('/admin/dashboard', authenticate, requireRole(['ADMIN']), adminController.getDashboardKPIs);
router.get('/admin/users', authenticate, requireRole(['ADMIN']), adminController.getAllUsers);
router.post('/admin/users/balance', authenticate, requireRole(['ADMIN']), adminController.adjustUserBalance);
router.post('/admin/users/status', authenticate, requireRole(['ADMIN']), adminController.toggleUserStatus);
router.post('/admin/users/reset-password', authenticate, requireRole(['ADMIN']), adminController.resetUserPassword);
router.get('/admin/users/:user_id/ledger', authenticate, requireRole(['ADMIN']), adminController.getUserLedger);

// Global & Per-Shop Commission Matrix Management
router.get('/admin/commission-matrix', authenticate, requireRole(['ADMIN']), adminController.getCommissionMatrix);
router.post('/admin/commission-matrix/update', authenticate, requireRole(['ADMIN']), adminController.updateCommissionMatrix);
router.get('/admin/users/:user_id/commissions', authenticate, requireRole(['ADMIN']), adminController.getShopCustomCommissions);
router.post('/admin/users/custom-commission', authenticate, requireRole(['ADMIN']), adminController.setShopCustomCommission);
router.post('/admin/users/custom-commission/delete', authenticate, requireRole(['ADMIN']), adminController.deleteShopCustomCommission);

// Global API Failover Toggle & Platform Transactions
router.get('/admin/failover', authenticate, requireRole(['ADMIN']), adminController.getFailoverSettings);
router.post('/admin/failover', authenticate, requireRole(['ADMIN']), adminController.updateFailoverSettings);
router.get('/admin/transactions', authenticate, requireRole(['ADMIN']), adminController.getAllTransactions);

// UPI Cash Deposit Approvals
router.get('/admin/deposits/pending', authenticate, requireRole(['ADMIN']), adminController.getPendingDeposits);
router.post('/admin/deposits/:id/approve', authenticate, requireRole(['ADMIN']), adminController.approveDeposit);
router.post('/admin/deposits/:id/reject', authenticate, requireRole(['ADMIN']), adminController.rejectDeposit);

// -------------------------------------------------------------
// 6. UPSTREAM TELECOM STATUS WEBHOOK CALLBACKS
// -------------------------------------------------------------
router.post('/webhook/upstream', verifyWebhookHmac, webhookController.handleUpstreamWebhook);

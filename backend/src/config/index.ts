import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://trihub_admin:trihub_secure_pass_2026@localhost:5432/trihub_recharge',
  jwtSecret: process.env.JWT_SECRET || 'trihub_technologies_corporate_jwt_secret_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Upstream Primary: A1Topup API
  a1Topup: {
    apiUrl: process.env.A1TOPUP_API_URL || 'https://api.a1topup.com/api/recharge',
    billFetchUrl: process.env.A1TOPUP_BILL_FETCH_URL || 'https://api.a1topup.com/api/bill/fetch',
    plansUrl: process.env.A1TOPUP_PLANS_URL || 'https://api.a1topup.com/api/plans',
    token: process.env.A1TOPUP_API_TOKEN || '',
    distributorId: process.env.A1TOPUP_DISTRIBUTOR_ID || '',
    timeoutMs: 8000, // Strict 8-second timeout requirement
    isSandbox: !process.env.A1TOPUP_API_TOKEN || process.env.A1TOPUP_API_TOKEN.trim() === ''
  },

  // Upstream Failover: Noble Web Studio / E2E Networks
  nobleWeb: {
    apiUrl: process.env.NOBLE_API_URL || 'https://api.noblewebstudio.in/v1/recharge',
    billFetchUrl: process.env.NOBLE_BILL_FETCH_URL || 'https://api.noblewebstudio.in/v1/bill/fetch',
    plansUrl: process.env.NOBLE_PLANS_URL || 'https://api.noblewebstudio.in/v1/plans',
    apiKey: process.env.NOBLE_API_KEY || '',
    timeoutMs: 4000, // Sub-400ms target, 4s max timeout
    isSandbox: !process.env.NOBLE_API_KEY || process.env.NOBLE_API_KEY.trim() === ''
  },

  // Webhook Security
  webhookHmacSecret: process.env.WEBHOOK_HMAC_SECRET || 'trihub_webhook_hmac_secret_key_prod_2026',

  // Dynamic UPI QR Settings
  upi: {
    vpa: process.env.PLATFORM_UPI_VPA || 'trihubpay@paytm',
    merchantName: process.env.PLATFORM_UPI_NAME || 'TriHubPay'
  },

  // Anti-Duplication Sliding Window
  dedupWindowMs: 30000 // 30 seconds
};

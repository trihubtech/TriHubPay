import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://trihub_admin:trihub_secure_pass_2026@localhost:5432/trihub_recharge',
  jwtSecret: process.env.JWT_SECRET || 'trihub_technologies_corporate_jwt_secret_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Dynamic Upstream Provider Routing (Change via .env with zero code changes)
  primaryProvider: (process.env.PRIMARY_PROVIDER || 'NEROPAY').toUpperCase(),
  fallbackProvider: (process.env.FALLBACK_PROVIDER || 'NOBLE').toUpperCase(),
  providerFallbackEnabled: process.env.PROVIDER_FALLBACK_ENABLED !== 'false',

  // Upstream Primary: NeroPay Gateway API (https://docs.neropay.co.in)
  neroPay: {
    baseUrl: process.env.NEROPAY_BASE_URL || 'https://app.neropay.co.in',
    apiUrl: process.env.NEROPAY_API_URL || `${process.env.NEROPAY_BASE_URL || 'https://app.neropay.co.in'}/apiservice/utility_payments`,
    balanceUrl: process.env.NEROPAY_BALANCE_URL || `${process.env.NEROPAY_BASE_URL || 'https://app.neropay.co.in'}/apiservice/balance_check`,
    statusUrl: process.env.NEROPAY_STATUS_URL || `${process.env.NEROPAY_BASE_URL || 'https://app.neropay.co.in'}/apiservice/status_check`,
    disputeUrl: process.env.NEROPAY_DISPUTE_URL || `${process.env.NEROPAY_BASE_URL || 'https://app.neropay.co.in'}/apiservice/raise_dispute`,
    voucherUrl: process.env.NEROPAY_VOUCHER_URL || `${process.env.NEROPAY_BASE_URL || 'https://app.neropay.co.in'}/apiservice/utility_payments`,
    billFetchUrl: process.env.NEROPAY_BILL_FETCH_URL || `${process.env.NEROPAY_BASE_URL || 'https://app.neropay.co.in'}/apiservice/bill_fetch`,
    plansUrl: process.env.NEROPAY_PLANS_URL || `${process.env.NEROPAY_BASE_URL || 'https://app.neropay.co.in'}/apiservice/plans`,
    token: (process.env.NEROPAY_TOKEN || process.env.NEROPAY_API_KEY || '').trim(),
    apiKey: (process.env.NEROPAY_TOKEN || process.env.NEROPAY_API_KEY || '').trim(),
    merchantId: (process.env.NEROPAY_MERCHANT_ID || '').trim(),
    timeoutMs: parseInt(process.env.NEROPAY_TIMEOUT_MS || '8000', 10), // Strict 8-second HTTP timeout requirement
    isSandbox: !(process.env.NEROPAY_TOKEN || process.env.NEROPAY_API_KEY) || (process.env.NEROPAY_TOKEN || process.env.NEROPAY_API_KEY || '').trim() === ''
  },

  // Upstream Failover / Dynamic Engine: Noble Web Studio / E2E Networks
  nobleWeb: {
    baseUrl: process.env.NOBLE_BASE_URL || 'https://api.noblewebstudio.in',
    apiUrl: process.env.NOBLE_API_URL || 'https://api.noblewebstudio.in/v1/recharge',
    voucherUrl: process.env.NOBLE_VOUCHER_URL || 'https://api.noblewebstudio.in/v1/voucher/issue',
    billFetchUrl: process.env.NOBLE_BILL_FETCH_URL || 'https://api.noblewebstudio.in/v1/bill/fetch',
    plansUrl: process.env.NOBLE_PLANS_URL || 'https://api.noblewebstudio.in/v1/plans',
    apiKey: (process.env.NOBLE_API_KEY || '').trim(),
    token: (process.env.NOBLE_API_TOKEN || process.env.NOBLE_API_KEY || '').trim(),
    timeoutMs: parseInt(process.env.NOBLE_TIMEOUT_MS || '8000', 10), // Strict 8-second timeout requirement
    isSandbox: !process.env.NOBLE_API_KEY || process.env.NOBLE_API_KEY.trim() === ''
  },

  // Legacy A1Topup (Kept for backwards compatibility fallback)
  a1Topup: {
    apiUrl: process.env.A1TOPUP_API_URL || 'https://api.a1topup.com/api/recharge',
    billFetchUrl: process.env.A1TOPUP_BILL_FETCH_URL || 'https://api.a1topup.com/api/bill/fetch',
    plansUrl: process.env.A1TOPUP_PLANS_URL || 'https://api.a1topup.com/api/plans',
    token: process.env.A1TOPUP_API_TOKEN || '',
    distributorId: process.env.A1TOPUP_DISTRIBUTOR_ID || '',
    timeoutMs: 8000,
    isSandbox: !process.env.A1TOPUP_API_TOKEN || process.env.A1TOPUP_API_TOKEN.trim() === ''
  },

  // Webhook Security
  webhookHmacSecret: process.env.WEBHOOK_HMAC_SECRET || 'trihub_webhook_hmac_secret_key_prod_2026',

  // Dynamic UPI QR Settings
  upi: {
    vpa: process.env.PLATFORM_UPI_VPA || '8270873279@upi',
    merchantName: process.env.PLATFORM_UPI_NAME || 'TriHub Technologies'
  },

  // Anti-Duplication Sliding Window
  dedupWindowMs: 30000, // 30 seconds

  // Email OTP (SMTP: Gmail App Password or Brevo Free Tier)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || 'trihubtechnologies@gmail.com',
    pass: (process.env.SMTP_PASS || 'hydzxzooflggcggk').replace(/\s+/g, ''),
    from: process.env.SMTP_FROM || '"TriHubPay Support" <trihubtechnologies@gmail.com>'
  }
};

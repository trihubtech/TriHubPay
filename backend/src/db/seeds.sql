-- B2B Multi-Tier Recharge Platform Seed Data
-- Passwords: 'Password@123' hashed with bcrypt (rounds=10)
-- Hash: $2b$10$wE47P8rD/iZ31O54dK8z0eCj/k52mC5QfLh1TfK7.3Vl0dF.Z2wQ6

-- 1. SEED USERS (Only Real Master Admin)
INSERT INTO users (id, organization_name, owner_name, phone, email, password_hash, role, current_balance, api_key, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'TriHub Technologies (Platform Master)', 'TriHub Admin', '6374569225', 'admin.pay@trihubtechnologies.com', '$2a$10$MthsMeKUb8EnV5w0ak8fmuwoYLXxRignwkNzh4Imb3FqfgJ0NyBx6', 'ADMIN', 0.0000, 'trihub-master-api-key-2026', true)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED GLOBAL COMMISSION MATRIX (NeroPay Primary + Noble Dynamic Failover)
INSERT INTO commission_matrix (
    operator_code, 
    operator_name, 
    service_type, 
    commission_type, 
    neropay_master_rate, 
    noble_master_rate, 
    retailer_pass_down_rate, 
    admin_net_margin, 
    is_noble_active, 
    is_active
) VALUES 
    -- Mobile Prepaid Operators (50/50 Split)
    ('JIO', 'Jio', 'MOBILE', 'PERCENT', 1.00, 1.00, 0.50, 0.50, false, true),
    ('AIRTEL', 'Airtel', 'MOBILE', 'PERCENT', 1.00, 1.00, 0.50, 0.50, false, true),
    ('VI', 'Vi', 'MOBILE', 'PERCENT', 3.50, 3.50, 1.75, 1.75, false, true),
    ('BSNL', 'BSNL', 'MOBILE', 'PERCENT', 3.00, 3.00, 1.50, 1.50, false, true),
    
    -- DTH Operators (50/50 Split)
    ('TATAPLAY', 'Tata Play', 'DTH', 'PERCENT', 3.10, 2.60, 1.55, 1.55, false, true),
    ('AIRTEL_DTH', 'Airtel DTH', 'DTH', 'PERCENT', 4.10, 3.50, 2.05, 2.05, false, true),
    ('DISHTV', 'Dish TV', 'DTH', 'PERCENT', 3.20, 3.50, 1.60, 1.60, false, true),
    ('SUNDIRECT', 'Sun Direct', 'DTH', 'PERCENT', 2.80, 3.60, 1.40, 1.40, false, true),
    ('VIDEOCON', 'Videocon d2h', 'DTH', 'PERCENT', 3.50, 3.60, 1.75, 1.75, false, true),
    ('VIDEOCON_D2H', 'Videocon d2h', 'DTH', 'PERCENT', 3.50, 3.60, 1.75, 1.75, false, true),
    
    -- Electricity Boards (Inactive for now)
    ('TNEB', 'TNEB Electricity', 'ELECTRICITY', 'FLAT', 0.00, 2.50, 1.45, 1.05, false, false),
    ('BESCOM', 'BESCOM Electricity', 'ELECTRICITY', 'FLAT', 0.00, 2.00, 1.16, 0.84, false, false),
    ('WBSEDCL', 'WBSEDCL Electricity', 'ELECTRICITY', 'FLAT', 0.00, 2.00, 1.16, 0.84, false, false),
    ('MSEB', 'MSEB Electricity', 'ELECTRICITY', 'FLAT', 0.00, 2.00, 1.16, 0.84, false, false),

    -- High-Margin New Categories (Inactive until upstream enabled)
    ('GOOGLE_PLAY', 'Google Play Redeem Code', 'GOOGLE_PLAY', 'PERCENT', 2.00, 3.00, 1.74, 1.26, false, false),
    ('OTT_APPS', 'OTT Streaming Vouchers', 'OTT_APPS', 'PERCENT', 3.50, 4.00, 2.32, 1.68, false, false),
    ('FASTAG', 'FASTag Recharge', 'FASTAG', 'PERCENT', 0.15, 0.30, 0.17, 0.13, false, false),
    ('LPG_GAS', 'LPG Gas Cylinder Booking', 'LPG_GAS', 'FLAT', 0.40, 6.00, 3.50, 2.50, false, false),
    ('BROADBAND', 'Broadband Bill Payment', 'BROADBAND', 'PERCENT', 0.50, 0.80, 0.46, 0.34, false, false)
ON CONFLICT (operator_code) DO NOTHING;

-- 4. PER-SHOP CUSTOMIZED COMMISSION OVERRIDES (Optional / Managed via Admin UI)
-- Empty by default; admins can configure custom rates per retailer from Admin Portal.

-- 5. SEED SYSTEM SETTINGS
INSERT INTO system_settings (key, value, description)
VALUES
    ('failover_mode', '{"mode": "AUTO", "timeout_ms": 8000}'::jsonb, 'Failover mode: AUTO, FORCE_A1TOPUP, FORCE_NOBLE_WEB'),
    ('providers_config', '{"a1topup": {"enabled": true, "timeout_ms": 8000}, "noble_web": {"enabled": true, "timeout_ms": 4000}}'::jsonb, 'Upstream providers runtime parameters'),
    ('platform_upi', '{"vpa": "trihubpay@paytm", "merchant_name": "TriHubPay", "note": "Prepaid Float Wallet Deposit"}'::jsonb, 'UPI QR payment details for instant shopkeeper wallet load'),
    ('master_wallet_metrics', '{"cached_balance": 184500.00, "low_balance_threshold": 25000.00, "last_updated": "2026-09-19T10:00:00Z"}'::jsonb, 'Master distributor upstream wallet monitor')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

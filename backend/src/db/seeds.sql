-- B2B Multi-Tier Recharge Platform Seed Data
-- Passwords: 'Password@123' hashed with bcrypt (rounds=10)
-- Hash: $2b$10$wE47P8rD/iZ31O54dK8z0eCj/k52mC5QfLh1TfK7.3Vl0dF.Z2wQ6

-- 1. SEED USERS (Only Real Master Admin)
INSERT INTO users (id, organization_name, owner_name, phone, email, password_hash, role, current_balance, api_key, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'TriHub Technologies (Platform Master)', 'TriHub Admin', '6374569225', 'admin.pay@trihubtechnologies.com', '$2a$10$MthsMeKUb8EnV5w0ak8fmuwoYLXxRignwkNzh4Imb3FqfgJ0NyBx6', 'ADMIN', 0.0000, 'trihub-master-api-key-2026', true)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED GLOBAL COMMISSION MATRIX
INSERT INTO commission_matrix (operator_code, operator_name, service_type, master_api_rate, retailer_pass_down_rate)
VALUES 
    -- Mobile Prepaid Operators
    ('JIO', 'Reliance Jio Infocomm', 'MOBILE', 5.80, 3.00),
    ('AIRTEL', 'Bharti Airtel', 'MOBILE', 5.50, 2.80),
    ('VI', 'Vodafone Idea', 'MOBILE', 6.00, 3.50),
    ('BSNL', 'BSNL GSM / Topup', 'MOBILE', 6.20, 4.00),
    
    -- DTH Operators
    ('TATAPLAY', 'Tata Play DTH', 'DTH', 5.60, 3.20),
    ('AIRTEL_DTH', 'Airtel Digital TV', 'DTH', 5.50, 3.00),
    ('DISHTV', 'Dish TV India', 'DTH', 6.00, 3.60),
    ('SUNDIRECT', 'Sun Direct TV', 'DTH', 5.80, 3.50),
    
    -- Electricity Boards
    ('TNEB', 'Tamil Nadu Generation and Distribution Corp (TANGEDCO)', 'ELECTRICITY', 1.50, 0.50),
    ('BESCOM', 'Bangalore Electricity Supply Company', 'ELECTRICITY', 1.50, 0.50),
    ('WBSEDCL', 'West Bengal State Electricity Distribution', 'ELECTRICITY', 1.50, 0.50),
    ('MSEB', 'Maharashtra State Electricity Distribution (MSEDCL)', 'ELECTRICITY', 1.50, 0.50)
ON CONFLICT (operator_code) DO NOTHING;

-- 4. SEED PER-SHOP CUSTOMIZED COMMISSION OVERRIDE
-- Sri Balaji Telecom gets 3.50% on JIO (instead of standard 3.00%) due to high monthly turnover
INSERT INTO user_commissions (user_id, operator_code, custom_pass_down_rate)
VALUES 
    ('00000000-0000-0000-0000-000000000003', 'JIO', 3.50),
    ('00000000-0000-0000-0000-000000000003', 'AIRTEL', 3.10)
ON CONFLICT (user_id, operator_code) DO NOTHING;

-- 5. SEED SYSTEM SETTINGS
INSERT INTO system_settings (key, value, description)
VALUES
    ('failover_mode', '{"mode": "AUTO", "timeout_ms": 8000}'::jsonb, 'Failover mode: AUTO, FORCE_A1TOPUP, FORCE_NOBLE_WEB'),
    ('providers_config', '{"a1topup": {"enabled": true, "timeout_ms": 8000}, "noble_web": {"enabled": true, "timeout_ms": 4000}}'::jsonb, 'Upstream providers runtime parameters'),
    ('platform_upi', '{"vpa": "trihubpay@paytm", "merchant_name": "TriHubPay", "note": "Prepaid Float Wallet Deposit"}'::jsonb, 'UPI QR payment details for instant shopkeeper wallet load'),
    ('master_wallet_metrics', '{"cached_balance": 184500.00, "low_balance_threshold": 25000.00, "last_updated": "2026-09-19T10:00:00Z"}'::jsonb, 'Master distributor upstream wallet monitor')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

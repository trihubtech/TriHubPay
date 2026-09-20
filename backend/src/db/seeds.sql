-- B2B Multi-Tier Recharge Platform Seed Data
-- Passwords: 'Password@123' hashed with bcrypt (rounds=10)
-- Hash: $2b$10$wE47P8rD/iZ31O54dK8z0eCj/k52mC5QfLh1TfK7.3Vl0dF.Z2wQ6

-- 1. SEED USERS
INSERT INTO users (id, organization_name, owner_name, phone, email, password_hash, role, current_balance, api_key, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'TriHubPay (Platform Master)', 'TriHubPay Admin', '9876543210', 'admin@trihubpay.in', '$2b$10$wE47P8rD/iZ31O54dK8z0eCj/k52mC5QfLh1TfK7.3Vl0dF.Z2wQ6', 'ADMIN', 500000.0000, '11111111-1111-1111-1111-111111111111', true),
    ('00000000-0000-0000-0000-000000000002', 'TriHubPay Metro Distribution', 'Karthik Distributor', '9876543211', 'distributor@trihubpay.in', '$2b$10$wE47P8rD/iZ31O54dK8z0eCj/k52mC5QfLh1TfK7.3Vl0dF.Z2wQ6', 'DISTRIBUTOR', 100000.0000, '22222222-2222-2222-2222-222222222222', true),
    ('00000000-0000-0000-0000-000000000003', 'Sri Balaji Telecom', 'Ramesh Kumar', '9876543220', 'balaji.telecom@gmail.com', '$2b$10$wE47P8rD/iZ31O54dK8z0eCj/k52mC5QfLh1TfK7.3Vl0dF.Z2wQ6', 'RETAILER', 15420.5000, '33333333-3333-3333-3333-333333333333', true),
    ('00000000-0000-0000-0000-000000000004', 'Murugan Mobile Care', 'Suresh Murugan', '9876543221', 'murugan.mobiles@gmail.com', '$2b$10$wE47P8rD/iZ31O54dK8z0eCj/k52mC5QfLh1TfK7.3Vl0dF.Z2wQ6', 'RETAILER', 8500.0000, '44444444-4444-4444-4444-444444444444', true),
    ('00000000-0000-0000-0000-000000000005', 'Star Communication', 'Vijay Anand', '9876543222', 'star.comm@gmail.com', '$2b$10$wE47P8rD/iZ31O54dK8z0eCj/k52mC5QfLh1TfK7.3Vl0dF.Z2wQ6', 'RETAILER', 22800.7500, '55555555-5555-5555-5555-555555555555', true)
ON CONFLICT (id) DO NOTHING;

-- 2. INITIAL LEDGER ENTRIES FOR RETAILERS
INSERT INTO wallet_ledger (user_id, amount, transaction_type, balance_before, balance_after, reference_id, description)
VALUES
    ('00000000-0000-0000-0000-000000000003', 15420.5000, 'CREDIT', 0.0000, 15420.5000, 'INIT_LOAD_001', 'Opening float prepaid wallet deposit via UPI'),
    ('00000000-0000-0000-0000-000000000004', 8500.0000, 'CREDIT', 0.0000, 8500.0000, 'INIT_LOAD_002', 'Opening float prepaid wallet deposit via UPI'),
    ('00000000-0000-0000-0000-000000000005', 22800.7500, 'CREDIT', 0.0000, 22800.7500, 'INIT_LOAD_003', 'Opening float prepaid wallet deposit via UPI');

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

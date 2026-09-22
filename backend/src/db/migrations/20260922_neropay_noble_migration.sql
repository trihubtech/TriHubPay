-- ====================================================================
-- PERN-Stack Migration: NeroPay Primary + Noble Dynamic Failover Engine
-- Date: 2026-09-22
-- Version: 2.0.0
-- ====================================================================

-- 1. EXTEND 'commission_matrix' TABLE
ALTER TABLE commission_matrix 
    ADD COLUMN IF NOT EXISTS neropay_master_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS noble_master_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS is_noble_active BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) NOT NULL DEFAULT 'PERCENT';

-- Drop old generated column for admin_net_margin if it exists to allow dynamic multi-provider evaluation
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commission_matrix' AND column_name = 'admin_net_margin' 
        AND is_generated = 'ALWAYS'
    ) THEN
        ALTER TABLE commission_matrix DROP COLUMN admin_net_margin;
        ALTER TABLE commission_matrix ADD COLUMN admin_net_margin NUMERIC(5, 2) NOT NULL DEFAULT 0.00;
    END IF;
END $$;

-- Update commission_type constraint
ALTER TABLE commission_matrix DROP CONSTRAINT IF EXISTS chk_commission_type;
ALTER TABLE commission_matrix ADD CONSTRAINT chk_commission_type 
    CHECK (commission_type IN ('PERCENT', 'FLAT'));

-- Update service_type constraint for commission_matrix
ALTER TABLE commission_matrix DROP CONSTRAINT IF EXISTS commission_matrix_service_type_check;
ALTER TABLE commission_matrix ADD CONSTRAINT commission_matrix_service_type_check 
    CHECK (service_type IN ('MOBILE', 'DTH', 'ELECTRICITY', 'GOOGLE_PLAY', 'OTT_APPS', 'FASTAG', 'LPG_GAS', 'BROADBAND'));

-- 2. EXTEND 'transactions' TABLE FOR VOUCHER DATA AND DUAL-PROVIDER UPSTREAM TRACKING
ALTER TABLE transactions 
    ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS voucher_pin VARCHAR(255);

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_upstream_api_used_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_upstream_api_used_check 
    CHECK (upstream_api_used IN (
        'NEROPAY', 
        'NOBLE', 
        'NEROPAY & NOBLE', 
        'A1TOPUP', 
        'NOBLE_WEB', 
        'MANUAL', 
        'NONE', 
        'PENDING', 
        'A1TOPUP & NOBLE_WEB'
    ));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_service_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_service_type_check 
    CHECK (service_type IN ('MOBILE', 'DTH', 'ELECTRICITY', 'GOOGLE_PLAY', 'OTT_APPS', 'FASTAG', 'LPG_GAS', 'BROADBAND'));

-- 3. SEED / UPSERT OPERATOR MATRIX WITH PRODUCTION-GRADE MARGIN CONFIGURATIONS
-- Standard rule: Retailer Pass-Down = 58% of max master rate (42% Admin margin)
-- Special rule for TNEB: Flat split (₹1.45 customer discount / ₹1.05 Admin profit)
-- Special rule for LPG_GAS: Flat split (₹3.50 customer discount / ₹2.50 Admin profit)
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
    -- 1. Mobile Telecom Operators
    ('JIO', 'Jio', 'MOBILE', 'PERCENT', 1.00, 1.00, 0.58, 0.42, false, true),
    ('AIRTEL', 'Airtel', 'MOBILE', 'PERCENT', 0.90, 1.00, 0.58, 0.42, false, true),
    ('VI', 'Vi', 'MOBILE', 'PERCENT', 3.50, 3.50, 2.03, 1.47, false, true),
    ('BSNL', 'BSNL', 'MOBILE', 'PERCENT', 3.00, 3.00, 1.74, 1.26, false, true),

    -- 2. DTH Providers
    ('SUNDIRECT', 'Sun Direct', 'DTH', 'PERCENT', 2.80, 3.60, 2.09, 1.51, false, true),
    ('AIRTEL_DTH', 'Airtel DTH', 'DTH', 'PERCENT', 4.10, 3.50, 2.38, 1.72, false, true),
    ('VIDEOCON_D2H', 'Videocon d2h', 'DTH', 'PERCENT', 3.50, 3.60, 2.09, 1.51, false, true),
    ('VIDEOCON', 'Videocon d2h', 'DTH', 'PERCENT', 3.50, 3.60, 2.09, 1.51, false, true),
    ('TATAPLAY', 'Tata Play', 'DTH', 'PERCENT', 3.10, 2.60, 1.80, 1.30, false, true),
    ('DISHTV', 'Dish TV', 'DTH', 'PERCENT', 3.20, 3.50, 2.03, 1.47, false, true),

    -- 3. Electricity & Utilities
    ('TNEB', 'TNEB Electricity', 'ELECTRICITY', 'FLAT', 0.00, 2.50, 1.45, 1.05, false, true),
    ('BESCOM', 'BESCOM Electricity', 'ELECTRICITY', 'FLAT', 0.00, 2.00, 1.16, 0.84, false, true),
    ('MSEB', 'MSEB Electricity', 'ELECTRICITY', 'FLAT', 0.00, 2.00, 1.16, 0.84, false, true),
    ('WBSEDCL', 'WBSEDCL Electricity', 'ELECTRICITY', 'FLAT', 0.00, 2.00, 1.16, 0.84, false, true),

    -- 4. Five New High-Margin Categories
    -- Google Play: NeroPay = 2.00% | Noble = 3.00% | Retailer Pass-Down = 1.74%
    ('GOOGLE_PLAY', 'Google Play Redeem Code', 'GOOGLE_PLAY', 'PERCENT', 2.00, 3.00, 1.74, 1.26, false, true),

    -- OTT Apps: NeroPay = 3.50% | Noble = 4.00% | Retailer Pass-Down = 2.32%
    ('OTT_APPS', 'OTT Streaming Vouchers', 'OTT_APPS', 'PERCENT', 3.50, 4.00, 2.32, 1.68, false, true),

    -- FASTag: NeroPay = 0.15% | Noble = 0.30% | Retailer Pass-Down = 0.17%
    ('FASTAG', 'FASTag Recharge', 'FASTAG', 'PERCENT', 0.15, 0.30, 0.17, 0.13, false, true),

    -- LPG Gas: NeroPay = 0.40% | Noble = ₹6.00 Flat Pool | Retailer Pass-Down = ₹3.50 Flat
    ('LPG_GAS', 'LPG Gas Cylinder Booking', 'LPG_GAS', 'FLAT', 0.40, 6.00, 3.50, 2.50, false, true),

    -- Broadband: NeroPay = 0.50% | Noble = 0.80% | Retailer Pass-Down = 0.46%
    ('BROADBAND', 'Broadband Bill Payment', 'BROADBAND', 'PERCENT', 0.50, 0.80, 0.46, 0.34, false, true)

ON CONFLICT (operator_code) DO UPDATE SET 
    operator_name = EXCLUDED.operator_name,
    service_type = EXCLUDED.service_type,
    commission_type = EXCLUDED.commission_type,
    neropay_master_rate = EXCLUDED.neropay_master_rate,
    noble_master_rate = EXCLUDED.noble_master_rate,
    retailer_pass_down_rate = EXCLUDED.retailer_pass_down_rate,
    admin_net_margin = EXCLUDED.admin_net_margin,
    is_active = true,
    updated_at = clock_timestamp();

-- Migration: 20260924_sync_jio_and_clean_overrides.sql
-- Purpose:
-- 1. Standardize Jio 50/50 wholesale split (1.00% master, 0.50% retailer, 0.50% admin)
-- 2. Remove redundant Jio custom override records so Sabi and Ferose see standard 0.50% without 'Custom' badge
-- 3. Create platform_notifications table for Admin-to-User broadcast announcements
-- 4. Create user_feedbacks table for Retailer-to-Admin feedback loop

BEGIN;

-- 1. Standardize Jio default rate in commission_matrix
UPDATE commission_matrix
SET 
    neropay_master_rate = 1.00,
    retailer_pass_down_rate = 0.50,
    admin_net_margin = 0.50,
    is_active = true,
    updated_at = clock_timestamp()
WHERE operator_code = 'JIO';

-- 2. Remove redundant Jio custom override entries that match the default rate
DELETE FROM user_commissions
WHERE operator_code = 'JIO' AND (custom_pass_down_rate = 0.50 OR custom_pass_down_rate = 0.80);

-- 3. Create platform_notifications table
CREATE TABLE IF NOT EXISTS platform_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'UPDATE' CHECK (type IN ('OFFER', 'UPDATE', 'FEATURE', 'ALERT')),
    target_type VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (target_type IN ('ALL', 'SELECTED')),
    target_user_ids JSONB DEFAULT '[]'::jsonb,
    created_by VARCHAR(150) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON platform_notifications(created_at DESC);

-- 4. Create user_feedbacks table
CREATE TABLE IF NOT EXISTS user_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(150),
    user_phone VARCHAR(50),
    organization_name VARCHAR(150),
    category VARCHAR(50) NOT NULL DEFAULT 'SUGGESTION' CHECK (category IN ('ISSUE', 'FEATURE', 'SERVICE', 'SUGGESTION', 'OTHER')),
    rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'RESOLVED')),
    admin_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON user_feedbacks(created_at DESC);

COMMIT;

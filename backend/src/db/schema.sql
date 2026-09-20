-- B2B Multi-Tier Recharge Platform Database Schema
-- ACID-Compliant, Optimized for High-Concurrency Fintech Transactions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ENTITIES TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(120) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'DISTRIBUTOR', 'RETAILER')),
    current_balance NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (current_balance >= 0),
    locked_balance NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (locked_balance >= 0),
    api_key UUID UNIQUE DEFAULT uuid_generate_v4(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- 2. IMMUTABLE CHRONOLOGICAL WALLET LEDGER TABLE
-- Implements double-entry style audit bookkeeping. No records should ever be updated or deleted.
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 4) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    balance_before NUMERIC(12, 4) NOT NULL,
    balance_after NUMERIC(12, 4) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON wallet_ledger(reference_id);

-- 3. GLOBAL COMMISSION MATRIX TABLE
-- Baseline rates configured by Admin across all telecom, DTH, and EB operators
CREATE TABLE IF NOT EXISTS commission_matrix (
    id SERIAL PRIMARY KEY,
    operator_code VARCHAR(50) UNIQUE NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('MOBILE', 'DTH', 'ELECTRICITY')),
    master_api_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.50 CHECK (master_api_rate >= 0),
    retailer_pass_down_rate NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (retailer_pass_down_rate >= 0),
    admin_net_margin NUMERIC(5, 2) GENERATED ALWAYS AS (master_api_rate - retailer_pass_down_rate) STORED,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_comm_matrix_service ON commission_matrix(service_type);

-- 4. PER-SHOP CUSTOMIZED COMMISSION OVERRIDES TABLE
-- Allows Platform Admin to assign specific, custom commission rates to individual retail shops
CREATE TABLE IF NOT EXISTS user_commissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operator_code VARCHAR(50) NOT NULL REFERENCES commission_matrix(operator_code) ON DELETE CASCADE,
    custom_pass_down_rate NUMERIC(5, 2) NOT NULL CHECK (custom_pass_down_rate >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_user_operator UNIQUE (user_id, operator_code)
);

CREATE INDEX IF NOT EXISTS idx_user_commissions_lookup ON user_commissions(user_id, operator_code);

-- 5. CORE TRANSACTIONS TABLE
-- Full audit trail of every recharge attempt, upstream routing, pricing breakdown, and execution status
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    internal_tx_id VARCHAR(100) UNIQUE NOT NULL,
    retailer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('MOBILE', 'DTH', 'ELECTRICITY')),
    operator_code VARCHAR(50) NOT NULL,
    target_account_number VARCHAR(100) NOT NULL,
    circle_code VARCHAR(50) DEFAULT 'ALL_INDIA',
    face_value NUMERIC(10, 2) NOT NULL CHECK (face_value > 0),
    retailer_commission NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    admin_commission NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    master_commission NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    final_cost_billed NUMERIC(10, 4) NOT NULL CHECK (final_cost_billed > 0),
    upstream_api_used VARCHAR(50) NOT NULL CHECK (upstream_api_used IN ('A1TOPUP', 'NOBLE_WEB', 'MANUAL', 'NONE', 'PENDING', 'A1TOPUP & NOBLE_WEB')),
    upstream_operator_ref VARCHAR(150),
    upstream_response_raw JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    failure_reason TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_tx_retailer_created ON transactions(retailer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_internal_id ON transactions(internal_tx_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);

-- 6. SYSTEM SETTINGS & PARAMETERS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7. UPI WALLET TOP-UPS TABLE
CREATE TABLE IF NOT EXISTS wallet_topups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    txn_ref VARCHAR(100) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    upi_payer_vpa VARCHAR(100),
    upi_txn_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_topup_user ON wallet_topups(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_ref ON wallet_topups(txn_ref);

-- 8. FREE EMAIL OTP PASSWORD RECOVERY TABLE
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_lookup ON password_reset_otps(user_id, otp_code, used);


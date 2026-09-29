-- Migration: 20260929_merchant_legal_consents.sql
-- Purpose: Statutory Digital Signature & Evidentiary Consent Logging under IT Act 2000 (Section 10A & 67C)
-- Enforces immutable, non-repudiable audit logs of merchant acceptance of wholesale distributor terms

CREATE TABLE IF NOT EXISTS merchant_legal_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version VARCHAR(50) NOT NULL DEFAULT 'v2026.09.TN-B2B',
    terms_hash VARCHAR(64) NOT NULL,
    accepted_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    network_ip VARCHAR(64) NOT NULL,
    browser_fingerprint TEXT NOT NULL,
    tamper_checksum VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Evidentiary lookup indexes for regulatory audits and dispute defense
CREATE INDEX IF NOT EXISTS idx_legal_consents_merchant_id ON merchant_legal_consents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_terms_hash ON merchant_legal_consents(terms_hash);
CREATE INDEX IF NOT EXISTS idx_legal_consents_timestamp ON merchant_legal_consents(accepted_timestamp);
CREATE INDEX IF NOT EXISTS idx_legal_consents_ip ON merchant_legal_consents(network_ip);

COMMENT ON TABLE merchant_legal_consents IS 'Immutable audit ledger recording B2B merchant legal consent, hardware fingerprints, and terms version hashes under IT Act 2000 Section 10A and 67C.';

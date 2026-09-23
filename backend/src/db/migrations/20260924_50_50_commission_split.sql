-- Migration: Set 50/50 Commission Split across all Mobile and DTH operators
-- Upstream wholesale rates from NeroPay are split 50% for Retailer and 50% for Admin.

-- 1. Mobile Telecom Operators
UPDATE commission_matrix 
SET neropay_master_rate = 1.00, retailer_pass_down_rate = 0.50, admin_net_margin = 0.50, updated_at = clock_timestamp() 
WHERE operator_code = 'JIO';

UPDATE commission_matrix 
SET neropay_master_rate = 1.00, retailer_pass_down_rate = 0.50, admin_net_margin = 0.50, updated_at = clock_timestamp() 
WHERE operator_code = 'AIRTEL';

UPDATE commission_matrix 
SET neropay_master_rate = 3.50, retailer_pass_down_rate = 1.75, admin_net_margin = 1.75, updated_at = clock_timestamp() 
WHERE operator_code = 'VI';

UPDATE commission_matrix 
SET neropay_master_rate = 3.00, retailer_pass_down_rate = 1.50, admin_net_margin = 1.50, updated_at = clock_timestamp() 
WHERE operator_code = 'BSNL';

-- 2. DTH Providers
UPDATE commission_matrix 
SET neropay_master_rate = 2.80, retailer_pass_down_rate = 1.40, admin_net_margin = 1.40, updated_at = clock_timestamp() 
WHERE operator_code = 'SUNDIRECT';

UPDATE commission_matrix 
SET neropay_master_rate = 4.10, retailer_pass_down_rate = 2.05, admin_net_margin = 2.05, updated_at = clock_timestamp() 
WHERE operator_code = 'AIRTEL_DTH';

UPDATE commission_matrix 
SET neropay_master_rate = 3.50, retailer_pass_down_rate = 1.75, admin_net_margin = 1.75, updated_at = clock_timestamp() 
WHERE operator_code IN ('VIDEOCON', 'VIDEOCON_D2H');

UPDATE commission_matrix 
SET neropay_master_rate = 3.10, retailer_pass_down_rate = 1.55, admin_net_margin = 1.55, updated_at = clock_timestamp() 
WHERE operator_code = 'TATAPLAY';

UPDATE commission_matrix 
SET neropay_master_rate = 3.20, retailer_pass_down_rate = 1.60, admin_net_margin = 1.60, updated_at = clock_timestamp() 
WHERE operator_code = 'DISHTV';

-- 3. Digital & Entertainment
UPDATE commission_matrix 
SET neropay_master_rate = 2.00, retailer_pass_down_rate = 1.00, admin_net_margin = 1.00, updated_at = clock_timestamp() 
WHERE operator_code = 'GOOGLE_PLAY';

UPDATE commission_matrix 
SET neropay_master_rate = 3.50, retailer_pass_down_rate = 1.75, admin_net_margin = 1.75, updated_at = clock_timestamp() 
WHERE operator_code = 'OTT_APPS';

-- 4. FASTag & LPG Gas
UPDATE commission_matrix 
SET neropay_master_rate = 0.20, retailer_pass_down_rate = 0.10, admin_net_margin = 0.10, updated_at = clock_timestamp() 
WHERE operator_code LIKE 'FASTAG%';

UPDATE commission_matrix 
SET neropay_master_rate = 2.00, retailer_pass_down_rate = 1.00, admin_net_margin = 1.00, updated_at = clock_timestamp() 
WHERE operator_code LIKE '%GAS%';

-- 5. Broadband
UPDATE commission_matrix 
SET neropay_master_rate = 0.50, retailer_pass_down_rate = 0.25, admin_net_margin = 0.25, updated_at = clock_timestamp() 
WHERE service_type = 'BROADBAND';

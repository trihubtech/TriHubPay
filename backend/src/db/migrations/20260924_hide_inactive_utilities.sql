-- Disable inactive utility services so only live Mobile and DTH recharges appear
UPDATE commission_matrix 
SET is_active = false 
WHERE service_type IN ('FASTAG', 'LPG_GAS', 'BROADBAND', 'ELECTRICITY', 'GOOGLE_PLAY', 'OTT_APPS');

-- Ensure Mobile and DTH are active
UPDATE commission_matrix 
SET is_active = true 
WHERE service_type IN ('MOBILE', 'DTH');

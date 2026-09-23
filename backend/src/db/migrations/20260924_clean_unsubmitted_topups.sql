-- Clean up any unsubmitted / abandoned QR generation sessions that lack a UTR
DELETE FROM wallet_topups 
WHERE (status = 'PENDING' OR status = 'INITIATED') 
  AND (upi_txn_id IS NULL OR upi_txn_id = '' OR upi_txn_id = 'N/A');

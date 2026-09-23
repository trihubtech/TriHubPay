import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { config } from '../config';
import { query, withTransaction } from '../db';

const topupRequestSchema = z.object({
  amount: z.number().min(10, 'Minimum UPI wallet top-up is ₹10').max(200000, 'Maximum top-up is ₹2,00,000')
});

/**
 * Get available wallet balance and status
 */
export async function getBalance(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const result = await query(
      'SELECT id, organization_name, owner_name, role, current_balance, locked_balance, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      data: {
        user_id: user.id,
        organization_name: user.organization_name,
        owner_name: user.owner_name,
        role: user.role,
        current_balance: parseFloat(user.current_balance),
        locked_balance: parseFloat(user.locked_balance),
        is_active: user.is_active
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Generate a dynamic UPI QR Code and deep-link for instant retailer wallet funding
 */
export async function generateUpiTopup(req: Request, res: Response) {
  try {
    const parsed = topupRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid top-up amount (Min ₹10, Max ₹2,00,000)' });
    }

    const userId = req.user!.id;
    const amount = parsed.data.amount;
    const txnRef = `UPI_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Note: Do NOT create a pending approval record until retailer submits their payment UTR

    // Build standard NPCI-compliant UPI payment URL
    // Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tr=REF&tn=NOTE&cu=INR
    const upiUri = `upi://pay?pa=${encodeURIComponent(config.upi.vpa)}&pn=${encodeURIComponent(config.upi.merchantName)}&am=${amount.toFixed(2)}&tr=${txnRef}&tn=${encodeURIComponent('Prepaid Wallet Topup ' + txnRef)}&cu=INR`;

    // Generate high-resolution QR Code image (base64 PNG)
    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return res.json({
      success: true,
      data: {
        txn_ref: txnRef,
        amount: amount,
        upi_vpa: config.upi.vpa,
        merchant_name: config.upi.merchantName,
        upi_string: upiUri,
        qr_code_data_url: qrDataUrl,
        expires_in_minutes: 15
      }
    });
  } catch (error: any) {
    console.error('[UPI TOPUP GENERATE ERROR]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Retailer submits UPI deposit payment with 12-digit UTR / Reference number for Admin verification
 */
export async function submitUpiDeposit(req: Request, res: Response) {
  try {
    const { txn_ref, utr_number, amount } = req.body;
    const userId = req.user!.id;

    if (!txn_ref) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required' });
    }
    if (!utr_number || String(utr_number).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Please enter valid 12-digit UPI UTR / Reference number from your payment app' });
    }

    const cleanUtr = String(utr_number).trim();
    const depositAmount = parseFloat(amount) || 0;

    // Check if record exists
    const existing = await query('SELECT id FROM wallet_topups WHERE txn_ref = $1', [txn_ref]);
    if (existing.rows.length > 0) {
      await query(
        `UPDATE wallet_topups SET 
          status = 'PENDING_APPROVAL',
          upi_txn_id = $1
         WHERE txn_ref = $2 AND user_id = $3`,
        [cleanUtr, txn_ref, userId]
      );
    } else {
      await query(
        `INSERT INTO wallet_topups (user_id, txn_ref, amount, upi_txn_id, status)
         VALUES ($1, $2, $3, $4, 'PENDING_APPROVAL')`,
        [userId, txn_ref, depositAmount, cleanUtr]
      );
    }

    return res.json({
      success: true,
      message: 'Deposit request submitted successfully! Admin will verify the bank transfer and credit your wallet shortly.'
    });
  } catch (error: any) {
    console.error('[SUBMIT UPI DEPOSIT ERROR]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Confirm/Simulate UPI Topup credit
 * In production, triggered by payment gateway webhook (Razorpay/Cashfree/Decentro/Paytm)
 * or instant UAT confirmation button in the UI.
 */
export async function confirmUpiTopup(req: Request, res: Response) {
  try {
    const { txn_ref, upi_txn_id } = req.body;
    const userId = req.user!.id;

    if (!txn_ref) {
      return res.status(400).json({ success: false, message: 'txn_ref is required' });
    }

    let updatedBalance = 0;

    await withTransaction(async (client) => {
      // Check topup record
      const topupRes = await client.query(
        'SELECT id, user_id, amount, status FROM wallet_topups WHERE txn_ref = $1 FOR UPDATE',
        [txn_ref]
      );

      if (topupRes.rows.length === 0) {
        throw new Error('Top-up transaction reference not found');
      }

      const topup = topupRes.rows[0];
      if (topup.status === 'COMPLETED') {
        throw new Error('This top-up reference has already been credited');
      }

      const amount = parseFloat(topup.amount);

      // Lock user row
      const userRes = await client.query(
        'SELECT current_balance FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );
      const curBal = parseFloat(userRes.rows[0].current_balance);
      updatedBalance = Number((curBal + amount).toFixed(4));

      // Credit wallet
      await client.query(
        'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
        [updatedBalance, userId]
      );

      // Record in ledger
      await client.query(
        `INSERT INTO wallet_ledger (
          user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
        ) VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)`,
        [
          userId,
          amount,
          curBal,
          updatedBalance,
          txn_ref,
          `Instant UPI Prepaid Wallet Load (Ref: ${upi_txn_id || 'UPI_APP'})`
        ]
      );

      // Mark topup completed
      await client.query(
        `UPDATE wallet_topups SET 
          status = 'COMPLETED',
          upi_txn_id = $1,
          completed_at = clock_timestamp()
         WHERE id = $2`,
        [upi_txn_id || `UPI_TXN_${Date.now()}`, topup.id]
      );
    });

    return res.json({
      success: true,
      message: 'Wallet successfully credited via UPI',
      data: {
        txn_ref,
        new_balance: updatedBalance
      }
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Fetch immutable chronological ledger entries for the user
 */
export async function getLedgerHistory(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);

    const ledgerRes = await query(
      `SELECT 
        id, amount, transaction_type, balance_before, balance_after, reference_id, description, created_at
       FROM wallet_ledger
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return res.json({
      success: true,
      data: ledgerRes.rows
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Fetch all UPI deposit requests and approvals for the logged-in retailer
 */
export async function getMyDeposits(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const result = await query(
      `SELECT 
        id, 
        txn_ref, 
        amount, 
        upi_txn_id as utr_number, 
        status, 
        admin_remarks, 
        created_at, 
        completed_at
       FROM wallet_topups
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

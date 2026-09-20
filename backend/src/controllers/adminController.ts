import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db';

/**
 * High-Level Operations Dashboard KPIs:
 * Network Volume, Net Admin Profit (from 5% margin spread), Upstream Success Rates, and Master Wallet Monitor
 */
export async function getDashboardKPIs(req: Request, res: Response) {
  try {
    // 1. Transaction volume and profit aggregates
    const txStats = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(face_value), 0) as total_volume,
        COALESCE(SUM(admin_commission), 0) as total_admin_profit,
        COALESCE(SUM(retailer_commission), 0) as total_retailer_payout,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as success_count,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN upstream_api_used = 'NOBLE_WEB' THEN 1 END) as failover_channel_count,
        COUNT(CASE WHEN upstream_api_used = 'A1TOPUP' THEN 1 END) as primary_channel_count
      FROM transactions;
    `);

    // 2. Retailer wallet statistics
    const userStats = await query(`
      SELECT 
        COUNT(CASE WHEN role = 'RETAILER' THEN 1 END) as total_retailers,
        COUNT(CASE WHEN role = 'RETAILER' AND is_active = true THEN 1 END) as active_retailers,
        COALESCE(SUM(CASE WHEN role = 'RETAILER' THEN current_balance ELSE 0 END), 0) as total_retailer_wallet_float
      FROM users;
    `);

    // 3. Master wallet alert parameters
    const settingsRes = await query("SELECT value FROM system_settings WHERE key = 'master_wallet_metrics' LIMIT 1");
    const masterMetrics = settingsRes.rows[0]?.value || {
      cached_balance: 184500.0,
      low_balance_threshold: 25000.0
    };

    // 4. Failover settings
    const failoverRes = await query("SELECT value FROM system_settings WHERE key = 'failover_mode' LIMIT 1");
    const failoverMode = failoverRes.rows[0]?.value?.mode || 'AUTO';

    const row = txStats.rows[0];
    const totalTx = parseInt(row.total_transactions, 10);
    const successTx = parseInt(row.success_count, 10);
    const successRate = totalTx > 0 ? Number(((successTx / totalTx) * 100).toFixed(1)) : 100.0;
    const totalVolume = parseFloat(row.total_volume);
    const netProfit = parseFloat(row.total_admin_profit);
    const effectiveAdminMargin = totalVolume > 0 ? Number(((netProfit / totalVolume) * 100).toFixed(2)) : 5.00;

    return res.json({
      success: true,
      data: {
        network_volume: totalVolume,
        net_admin_profit: netProfit,
        effective_admin_margin_percent: effectiveAdminMargin,
        total_retailer_payout: parseFloat(row.total_retailer_payout),
        total_transactions: totalTx,
        success_count: successTx,
        failed_count: parseInt(row.failed_count, 10),
        pending_count: parseInt(row.pending_count, 10),
        success_rate_percent: successRate,
        primary_a1_count: parseInt(row.primary_channel_count, 10),
        failover_noble_count: parseInt(row.failover_channel_count, 10),
        total_retailers: parseInt(userStats.rows[0].total_retailers, 10),
        active_retailers: parseInt(userStats.rows[0].active_retailers, 10),
        retailer_float_liability: parseFloat(userStats.rows[0].total_retailer_wallet_float),
        master_wallet: {
          balance: parseFloat(masterMetrics.cached_balance),
          threshold: parseFloat(masterMetrics.low_balance_threshold),
          is_low_balance: parseFloat(masterMetrics.cached_balance) < parseFloat(masterMetrics.low_balance_threshold)
        },
        failover_mode: failoverMode
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * List all shops and users with balances
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    const usersRes = await query(`
      SELECT 
        u.id, u.organization_name, u.owner_name, u.phone, u.email, u.role, 
        u.current_balance, u.locked_balance, u.api_key, u.is_active, u.created_at,
        (SELECT COUNT(*) FROM transactions t WHERE t.retailer_id = u.id) as total_recharges,
        (SELECT COALESCE(SUM(face_value), 0) FROM transactions t WHERE t.retailer_id = u.id) as total_recharged_volume
      FROM users u
      ORDER BY u.created_at ASC;
    `);

    return res.json({
      success: true,
      data: usersRes.rows
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Adjust a shop's balance (Credit or Debit) with row-level locking and audit trail
 */
export async function adjustUserBalance(req: Request, res: Response) {
  try {
    const { user_id, amount, action_type, reason } = req.body;

    if (!user_id || !amount || !action_type || !reason) {
      return res.status(400).json({ success: false, message: 'user_id, amount, action_type (CREDIT/DEBIT), and reason are required' });
    }

    const adjAmount = Math.abs(parseFloat(amount));
    if (adjAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }

    let updatedBalance = 0;
    const adminId = req.user!.id;
    const adminEmail = req.user!.email;

    await withTransaction(async (client) => {
      // Row level lock on the target shopkeeper
      const uRes = await client.query(
        'SELECT current_balance, organization_name FROM users WHERE id = $1 FOR UPDATE',
        [user_id]
      );

      if (uRes.rows.length === 0) {
        throw new Error('Target user does not exist');
      }

      const curBal = parseFloat(uRes.rows[0].current_balance);

      if (action_type === 'DEBIT' && curBal < adjAmount) {
        throw new Error(`Cannot debit ₹${adjAmount}. User current balance is only ₹${curBal.toFixed(2)}`);
      }

      updatedBalance = action_type === 'CREDIT' 
        ? Number((curBal + adjAmount).toFixed(4))
        : Number((curBal - adjAmount).toFixed(4));

      await client.query(
        'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
        [updatedBalance, user_id]
      );

      const refId = `ADMIN_ADJ_${Date.now()}`;
      await client.query(
        `INSERT INTO wallet_ledger (
          user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user_id,
          adjAmount,
          action_type,
          curBal,
          updatedBalance,
          refId,
          `Admin Adjustment by ${adminEmail}: ${reason}`
        ]
      );
    });

    return res.json({
      success: true,
      message: `Successfully ${action_type === 'CREDIT' ? 'credited' : 'debited'} ₹${adjAmount.toFixed(2)}`,
      data: {
        user_id,
        new_balance: updatedBalance
      }
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * Toggle user active/deactivated state
 */
export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const { user_id, is_active } = req.body;
    await query('UPDATE users SET is_active = $1, updated_at = clock_timestamp() WHERE id = $2', [Boolean(is_active), user_id]);
    return res.json({ success: true, message: `Shop account ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get full ledger history for any shopkeeper
 */
export async function getUserLedger(req: Request, res: Response) {
  try {
    const { user_id } = req.params;
    const ledgerRes = await query(
      `SELECT id, amount, transaction_type, balance_before, balance_after, reference_id, description, created_at
       FROM wallet_ledger
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [user_id]
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
 * Get global commission matrix
 */
export async function getCommissionMatrix(req: Request, res: Response) {
  try {
    const matrixRes = await query(`
      SELECT 
        id, operator_code, operator_name, service_type, 
        master_api_rate, retailer_pass_down_rate, admin_net_margin, 
        is_active, updated_at
      FROM commission_matrix
      ORDER BY service_type, operator_name ASC
    `);

    return res.json({ success: true, data: matrixRes.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update global baseline commission rate for an operator
 */
export async function updateCommissionMatrix(req: Request, res: Response) {
  try {
    const { operator_code, master_api_rate, retailer_pass_down_rate, is_active } = req.body;

    if (!operator_code) {
      return res.status(400).json({ success: false, message: 'operator_code is required' });
    }

    const masterRate = parseFloat(master_api_rate);
    const retailerRate = parseFloat(retailer_pass_down_rate);

    if (retailerRate > masterRate) {
      return res.status(400).json({
        success: false,
        message: `Retailer rate (${retailerRate}%) cannot exceed Master API payout (${masterRate}%). You would lose money on every recharge!`
      });
    }

    await query(
      `UPDATE commission_matrix SET 
        master_api_rate = $1,
        retailer_pass_down_rate = $2,
        is_active = COALESCE($3, is_active),
        updated_at = clock_timestamp()
       WHERE operator_code = $4`,
      [masterRate, retailerRate, is_active, operator_code]
    );

    return res.json({ success: true, message: `Commission matrix for ${operator_code} updated successfully` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get shop-specific custom commission overrides
 */
export async function getShopCustomCommissions(req: Request, res: Response) {
  try {
    const { user_id } = req.params;
    const resOverrides = await query(
      `SELECT 
        uc.id, uc.user_id, uc.operator_code, uc.custom_pass_down_rate, uc.updated_at,
        cm.operator_name, cm.service_type, cm.master_api_rate, cm.retailer_pass_down_rate as default_rate
       FROM user_commissions uc
       JOIN commission_matrix cm ON cm.operator_code = uc.operator_code
       WHERE uc.user_id = $1
       ORDER BY cm.service_type, cm.operator_name`,
      [user_id]
    );

    return res.json({ success: true, data: resOverrides.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Set/Update a custom commission override for an individual retail shop
 */
export async function setShopCustomCommission(req: Request, res: Response) {
  try {
    const { user_id, operator_code, custom_pass_down_rate } = req.body;

    if (!user_id || !operator_code || custom_pass_down_rate === undefined) {
      return res.status(400).json({ success: false, message: 'user_id, operator_code, and custom_pass_down_rate are required' });
    }

    const rate = parseFloat(custom_pass_down_rate);

    // Verify against master rate
    const opRes = await query('SELECT master_api_rate FROM commission_matrix WHERE operator_code = $1', [operator_code]);
    if (opRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Operator code not found' });
    }

    const masterRate = parseFloat(opRes.rows[0].master_api_rate);
    if (rate > masterRate) {
      return res.status(400).json({
        success: false,
        message: `Custom shop rate (${rate}%) exceeds Master API rate (${masterRate}%). Margin must remain non-negative.`
      });
    }

    await query(
      `INSERT INTO user_commissions (user_id, operator_code, custom_pass_down_rate)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, operator_code)
       DO UPDATE SET custom_pass_down_rate = EXCLUDED.custom_pass_down_rate, updated_at = clock_timestamp()`,
      [user_id, operator_code, rate]
    );

    return res.json({
      success: true,
      message: `Custom commission of ${rate}% set for shop on ${operator_code}`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Remove a shop-specific custom commission override (reverting back to global matrix)
 */
export async function deleteShopCustomCommission(req: Request, res: Response) {
  try {
    const { user_id, operator_code } = req.body;
    await query('DELETE FROM user_commissions WHERE user_id = $1 AND operator_code = $2', [user_id, operator_code]);
    return res.json({ success: true, message: `Reverted to default matrix rate for ${operator_code}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get and update Global Failover Toggle Settings
 */
export async function getFailoverSettings(req: Request, res: Response) {
  try {
    const resFailover = await query("SELECT value FROM system_settings WHERE key = 'failover_mode' LIMIT 1");
    return res.json({
      success: true,
      data: resFailover.rows[0]?.value || { mode: 'AUTO', timeout_ms: 8000 }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateFailoverSettings(req: Request, res: Response) {
  try {
    const { mode, timeout_ms } = req.body;
    if (!['AUTO', 'FORCE_A1TOPUP', 'FORCE_NOBLE_WEB'].includes(mode)) {
      return res.status(400).json({ success: false, message: "Mode must be 'AUTO', 'FORCE_A1TOPUP', or 'FORCE_NOBLE_WEB'" });
    }

    const value = { mode, timeout_ms: timeout_ms || 8000, updated_by: req.user!.email, updated_at: new Date().toISOString() };

    await query(
      `INSERT INTO system_settings (key, value)
       VALUES ('failover_mode', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = clock_timestamp()`,
      [JSON.stringify(value)]
    );

    return res.json({
      success: true,
      message: `Failover routing mode set to: ${mode}`,
      data: value
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * View live transactions with search/filter across the whole platform
 */
export async function getAllTransactions(req: Request, res: Response) {
  try {
    const limit = parseInt(String(req.query.limit || '100'), 10);
    const txs = await query(`
      SELECT 
        t.id, t.internal_tx_id, t.service_type, t.operator_code, t.target_account_number,
        t.face_value, t.retailer_commission, t.admin_commission, t.final_cost_billed,
        t.upstream_api_used, t.upstream_operator_ref, t.status, t.failure_reason, t.created_at,
        u.organization_name as retailer_shop_name, u.phone as retailer_phone
      FROM transactions t
      JOIN users u ON u.id = t.retailer_id
      ORDER BY t.created_at DESC
      LIMIT $1`,
      [limit]
    );

    return res.json({ success: true, data: txs.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Reset a shopkeeper's password from Admin Console
 */
export async function resetUserPassword(req: Request, res: Response) {
  try {
    const { user_id, new_password } = req.body;
    if (!user_id || !new_password) {
      return res.status(400).json({ success: false, message: 'user_id and new_password are required' });
    }

    if (String(new_password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    const result = await query(
      'UPDATE users SET password_hash = $1, updated_at = clock_timestamp() WHERE id = $2 RETURNING organization_name, phone, email',
      [passwordHash, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: `Password reset successfully for ${result.rows[0].organization_name}`,
      data: {
        shop_name: result.rows[0].organization_name,
        phone: result.rows[0].phone,
        email: result.rows[0].email
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * List all pending UPI cash deposits awaiting Admin verification
 */
export async function getPendingDeposits(req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT wt.id, wt.user_id, wt.txn_ref, wt.amount, wt.upi_txn_id as utr_number, wt.status, wt.created_at,
             u.organization_name, u.owner_name, u.phone, u.current_balance as current_wallet_balance
      FROM wallet_topups wt
      JOIN users u ON wt.user_id = u.id
      WHERE wt.status = 'PENDING_APPROVAL'
      ORDER BY wt.created_at DESC;
    `);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Admin approves verified UPI payment and credits retailer wallet
 */
export async function approveDeposit(req: Request, res: Response) {
  try {
    const { id } = req.params;

    let updatedBalance = 0;
    let shopName = '';
    let amount = 0;

    await withTransaction(async (client) => {
      // Find topup
      const topupRes = await client.query(
        'SELECT id, user_id, amount, upi_txn_id, txn_ref, status FROM wallet_topups WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (topupRes.rows.length === 0) {
        throw new Error('Deposit request not found');
      }

      const topup = topupRes.rows[0];
      if (topup.status === 'COMPLETED') {
        throw new Error('This deposit has already been approved and credited');
      }

      amount = parseFloat(topup.amount);

      // Lock user row
      const userRes = await client.query(
        'SELECT id, organization_name, current_balance FROM users WHERE id = $1 FOR UPDATE',
        [topup.user_id]
      );

      if (userRes.rows.length === 0) {
        throw new Error('Associated retailer user account not found');
      }

      const user = userRes.rows[0];
      shopName = user.organization_name;
      const curBal = parseFloat(user.current_balance);
      updatedBalance = Number((curBal + amount).toFixed(4));

      // 1. Credit retailer balance
      await client.query(
        'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
        [updatedBalance, user.id]
      );

      // 1b. Also credit Master Admin float vault
      const adminRes = await client.query(
        "SELECT id, current_balance FROM users WHERE role = 'ADMIN' LIMIT 1"
      );
      if (adminRes.rows.length > 0) {
        const adminUser = adminRes.rows[0];
        const adminCurBal = parseFloat(adminUser.current_balance || '0');
        const adminNewBal = Number((adminCurBal + amount).toFixed(4));
        await client.query(
          'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
          [adminNewBal, adminUser.id]
        );

        // Record in Admin ledger
        await client.query(
          `INSERT INTO wallet_ledger (
            user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
          ) VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)`,
          [
            adminUser.id,
            amount,
            adminCurBal,
            adminNewBal,
            `ADM_${topup.txn_ref}`,
            `Prepaid Float Received via UPI from ${shopName} (UTR: ${topup.upi_txn_id || 'BANK_VERIFIED'})`
          ]
        );
      }

      // 2. Add audit entry in retailer wallet_ledger
      await client.query(
        `INSERT INTO wallet_ledger (
          user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
        ) VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)`,
        [
          user.id,
          amount,
          curBal,
          updatedBalance,
          topup.txn_ref,
          `UPI Deposit Verified & Credited (UTR: ${topup.upi_txn_id || 'BANK_VERIFIED'})`
        ]
      );

      // 3. Mark topup as COMPLETED
      await client.query(
        `UPDATE wallet_topups SET 
          status = 'COMPLETED',
          completed_at = clock_timestamp()
         WHERE id = $1`,
        [id]
      );
    });

    return res.json({
      success: true,
      message: `Successfully credited ₹${amount} to ${shopName}. New balance: ₹${updatedBalance}`,
      data: {
        new_balance: updatedBalance,
        amount
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Admin rejects invalid/unreceived UPI payment
 */
export async function rejectDeposit(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await query(
      `UPDATE wallet_topups SET 
        status = 'REJECTED',
        completed_at = clock_timestamp()
       WHERE id = $1`,
      [id]
    );

    return res.json({
      success: true,
      message: `Deposit request marked as rejected.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}



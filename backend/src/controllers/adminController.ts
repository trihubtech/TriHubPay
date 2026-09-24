import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db';
import { NeroPayClient } from '../services/upstream/neropay';

/**
 * High-Level Operations Dashboard KPIs:
 * Network Volume, Net Admin Profit (from margin spread), Upstream Success Rates, and Master Wallet Monitor
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
        COUNT(CASE WHEN upstream_api_used = 'NOBLE' OR upstream_api_used = 'NOBLE_WEB' THEN 1 END) as failover_channel_count,
        COUNT(CASE WHEN upstream_api_used = 'NEROPAY' OR upstream_api_used = 'A1TOPUP' THEN 1 END) as primary_channel_count
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

    // 3. Live Master Distributor Wallet Balance (Direct from NeroPay Upstream)
    let liveMasterBalance = 100.0;
    const lowBalanceThreshold = parseFloat(process.env.MASTER_WALLET_LOW_THRESHOLD || '20.0');

    try {
      const neroClient = new NeroPayClient();
      const balRes = await neroClient.checkBalance();
      if (balRes && typeof balRes.main === 'number' && !isNaN(balRes.main)) {
        liveMasterBalance = balRes.main;
      }
    } catch (e: any) {
      console.warn('[ADMIN OVERVIEW] Could not query live NeroPay balance:', e.message);
      const settingsRes = await query("SELECT value FROM system_settings WHERE key = 'master_wallet_metrics' LIMIT 1");
      if (settingsRes.rows.length > 0 && settingsRes.rows[0].value?.cached_balance !== undefined) {
        liveMasterBalance = parseFloat(settingsRes.rows[0].value.cached_balance) || 100.0;
      }
    }

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
          balance: liveMasterBalance,
          threshold: lowBalanceThreshold,
          is_low_balance: liveMasterBalance < lowBalanceThreshold
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

    if (!user_id || amount === undefined || !action_type || !reason) {
      return res.status(400).json({ success: false, message: 'user_id, amount, action_type (CREDIT/DEBIT/SET), and reason are required' });
    }

    const adjAmount = Math.abs(parseFloat(amount));
    if (isNaN(adjAmount)) {
      return res.status(400).json({ success: false, message: 'Amount must be a valid number' });
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

      if (action_type === 'SET') {
        updatedBalance = Number(adjAmount.toFixed(4));
      } else if (action_type === 'CREDIT') {
        updatedBalance = Number((curBal + adjAmount).toFixed(4));
      } else {
        updatedBalance = Number((curBal - adjAmount).toFixed(4));
      }

      await client.query(
        'UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
        [updatedBalance, user_id]
      );

      const refId = `ADMIN_ADJ_${Date.now()}`;
      const effectiveType = action_type === 'SET' ? (curBal <= updatedBalance ? 'CREDIT' : 'DEBIT') : action_type;
      const ledgerAmount = action_type === 'SET' ? Math.abs(Number((updatedBalance - curBal).toFixed(4))) : adjAmount;

      await client.query(
        `INSERT INTO wallet_ledger (
          user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user_id,
          ledgerAmount,
          effectiveType,
          curBal,
          updatedBalance,
          refId,
          action_type === 'SET' 
            ? `Admin Set Balance to ₹${updatedBalance.toFixed(2)} by ${adminEmail}: ${reason}`
            : `Admin Adjustment by ${adminEmail}: ${reason}`
        ]
      );
    });

    return res.json({
      success: true,
      message: action_type === 'SET' 
        ? `Successfully set balance to ₹${updatedBalance.toFixed(2)}`
        : `Successfully ${action_type === 'CREDIT' ? 'credited' : 'debited'} ₹${adjAmount.toFixed(2)}`,
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
 * Admin: Update any retailer's profile with uniqueness check
 */
export async function updateUserProfile(req: Request, res: Response) {
  try {
    const { user_id } = req.params;
    const { organization_name, owner_name, phone, email } = req.body;

    if (!user_id || !organization_name || !owner_name || !phone || !email) {
      return res.status(400).json({ success: false, message: 'user_id, organization_name, owner_name, phone, and email are required' });
    }

    const cleanPhone = String(phone).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOrg = String(organization_name).trim();
    const cleanOwner = String(owner_name).trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    // 1. Uniqueness check: Phone
    const phoneCheck = await query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2 LIMIT 1',
      [cleanPhone, user_id]
    );
    if (phoneCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already registered to another account. Every profile must have a unique mobile number.'
      });
    }

    // 2. Uniqueness check: Email
    const emailCheck = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2 LIMIT 1',
      [cleanEmail, user_id]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered to another account. Every profile must have a unique email.'
      });
    }

    // 3. Update User
    await query(
      'UPDATE users SET organization_name = $1, owner_name = $2, phone = $3, email = $4 WHERE id = $5',
      [cleanOrg, cleanOwner, cleanPhone, cleanEmail, user_id]
    );

    const updatedUserRes = await query(
      'SELECT id, organization_name, owner_name, phone, email, role, current_balance, is_active FROM users WHERE id = $1',
      [user_id]
    );

    return res.json({
      success: true,
      message: 'User profile updated successfully',
      data: updatedUserRes.rows[0]
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get global commission matrix with dual-provider rates
 */
export async function getCommissionMatrix(req: Request, res: Response) {
  try {
    const matrixRes = await query(`
      SELECT 
        id, operator_code, operator_name, service_type, commission_type,
        neropay_master_rate, noble_master_rate, retailer_pass_down_rate, 
        admin_net_margin, is_noble_active, is_active, updated_at
      FROM commission_matrix
      ORDER BY service_type, operator_name ASC
    `);

    const rows = matrixRes.rows.map(row => {
      const nero = parseFloat(String(row.neropay_master_rate ?? 0));
      const noble = parseFloat(String(row.noble_master_rate ?? 0));
      const master = row.is_noble_active ? Math.max(nero, noble) : nero;
      let retailerRate = parseFloat(String(row.retailer_pass_down_rate ?? 0));
      let adminMargin = parseFloat(String(row.admin_net_margin ?? 0));

      // If rates in database are still from old legacy seed (e.g. 3.00% when master is 1.00%), enforce true 50/50 split
      if (retailerRate > master || (retailerRate + adminMargin > master * 1.2) || retailerRate === 0) {
        retailerRate = Number((master * 0.50).toFixed(2));
        adminMargin = Number((master - retailerRate).toFixed(2));
      }

      return {
        ...row,
        neropay_master_rate: nero,
        noble_master_rate: noble,
        retailer_pass_down_rate: retailerRate,
        admin_net_margin: adminMargin
      };
    });

    return res.json({ success: true, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update global baseline commission rate for an operator
 */
export async function updateCommissionMatrix(req: Request, res: Response) {
  try {
    const { 
      operator_code, 
      neropay_master_rate, 
      noble_master_rate, 
      retailer_pass_down_rate, 
      is_noble_active,
      commission_type,
      is_active 
    } = req.body;

    if (!operator_code) {
      return res.status(400).json({ success: false, message: 'operator_code is required' });
    }

    const neroRate = parseFloat(neropay_master_rate ?? (req.body as any).master_api_rate ?? '0');
    const nobleRate = parseFloat(noble_master_rate || '0');
    const nobleActive = is_noble_active !== undefined ? Boolean(is_noble_active) : false;
    const maxMaster = nobleActive ? Math.max(neroRate, nobleRate) : neroRate;

    // Standard 50% pass down if not specified explicitly (50/50 split with admin)
    let passDown = retailer_pass_down_rate !== undefined ? parseFloat(retailer_pass_down_rate) : Number((maxMaster * 0.50).toFixed(2));
    if (passDown > maxMaster) {
      passDown = maxMaster;
    }
    const adminMargin = Number((maxMaster - passDown).toFixed(2));

    await query(
      `UPDATE commission_matrix SET 
        neropay_master_rate = $1, 
        noble_master_rate = $2, 
        retailer_pass_down_rate = $3, 
        admin_net_margin = $4,
        is_noble_active = $5,
        commission_type = COALESCE($6, commission_type),
        is_active = COALESCE($7, is_active),
        updated_at = clock_timestamp()
      WHERE operator_code = $8`,
      [neroRate, nobleRate, passDown, adminMargin, nobleActive, commission_type, is_active, operator_code]
    );

    return res.json({ 
      success: true, 
      message: `Commission matrix for ${operator_code} updated successfully`,
      data: {
        operator_code,
        neropay_master_rate: neroRate,
        noble_master_rate: nobleRate,
        is_noble_active: nobleActive,
        retailer_pass_down_rate: passDown,
        admin_net_margin: adminMargin
      }
    });
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
        cm.operator_name, cm.service_type, 
        cm.neropay_master_rate as master_api_rate, 
        cm.retailer_pass_down_rate as default_rate
       FROM user_commissions uc
       JOIN commission_matrix cm ON cm.operator_code = uc.operator_code
       WHERE uc.user_id = $1
       ORDER BY cm.service_type, cm.operator_name`,
      [user_id]
    );

    const data = resOverrides.rows.map(r => {
      const master = parseFloat(String(r.master_api_rate ?? 1.0));
      const def = parseFloat(String(r.default_rate ?? (master * 0.5)));
      return {
        ...r,
        master_api_rate: master,
        default_rate: (def > 0 && def <= master) ? def : Number((master * 0.50).toFixed(2))
      };
    });

    return res.json({ success: true, data });
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
    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid custom rate' });
    }

    // Verify against master rate
    const opRes = await query('SELECT neropay_master_rate, noble_master_rate, is_noble_active FROM commission_matrix WHERE operator_code = $1', [operator_code]);
    if (opRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Operator code not found' });
    }

    const nero = parseFloat(opRes.rows[0].neropay_master_rate || '0');
    const noble = parseFloat(opRes.rows[0].noble_master_rate || '0');
    const masterRate = opRes.rows[0].is_noble_active ? Math.max(nero, noble) : nero;

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
    const { mode, timeout_ms, is_noble_active } = req.body;
    const validModes = ['AUTO', 'PHASE_1_NEROPAY', 'PHASE_2_DYNAMIC_FAILOVER', 'FORCE_NEROPAY', 'FORCE_NOBLE_WEB', 'FORCE_A1TOPUP'];
    
    if (mode && !validModes.includes(mode)) {
      return res.status(400).json({ 
        success: false, 
        message: `Mode must be one of: ${validModes.join(', ')}` 
      });
    }

    const currentMode = mode || 'AUTO';
    const nobleActive = is_noble_active !== undefined 
      ? Boolean(is_noble_active) 
      : (currentMode === 'PHASE_2_DYNAMIC_FAILOVER' || currentMode === 'AUTO');

    // Update is_noble_active across commission_matrix if explicitly toggled or switching phase
    if (is_noble_active !== undefined || currentMode === 'PHASE_1_NEROPAY' || currentMode === 'PHASE_2_DYNAMIC_FAILOVER') {
      await query('UPDATE commission_matrix SET is_noble_active = $1, updated_at = clock_timestamp()', [nobleActive]);
    }

    const value = { 
      mode: currentMode, 
      is_noble_active: nobleActive,
      timeout_ms: timeout_ms || 8000, 
      updated_by: req.user!.email, 
      updated_at: new Date().toISOString() 
    };

    await query(
      `INSERT INTO system_settings (key, value)
       VALUES ('failover_mode', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = clock_timestamp()`,
      [JSON.stringify(value)]
    );

    return res.json({
      success: true,
      message: `Routing mode updated to: ${currentMode} (is_noble_active: ${nobleActive})`,
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
 * List all UPI cash deposits with optional status filter (PENDING_APPROVAL, COMPLETED, REJECTED, ALL)
 */
export async function getPendingDeposits(req: Request, res: Response) {
  try {
    const status = String(req.query.status || 'ALL').toUpperCase();
    let querySql = `
      SELECT wt.id, wt.user_id, wt.txn_ref, wt.amount, wt.upi_txn_id as utr_number, wt.status, wt.admin_remarks, wt.created_at, wt.completed_at,
             u.organization_name, u.owner_name, u.phone, u.current_balance as current_wallet_balance
      FROM wallet_topups wt
      JOIN users u ON wt.user_id = u.id
    `;
    const params: any[] = [];

    if (status === 'PENDING') {
      querySql += " WHERE wt.status = 'PENDING_APPROVAL' AND wt.upi_txn_id IS NOT NULL AND wt.upi_txn_id != ''";
    } else if (status !== 'ALL') {
      querySql += ' WHERE wt.status = $1';
      params.push(status);
    } else {
      querySql += " WHERE wt.status != 'PENDING' OR (wt.upi_txn_id IS NOT NULL AND wt.upi_txn_id != '')";
    }

    querySql += ' ORDER BY wt.created_at DESC;';

    const result = await query(querySql, params);

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
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            adminUser.id,
            amount,
            'CREDIT',
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user.id,
          amount,
          'CREDIT',
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
          admin_remarks = 'Deposit Approved & Credited to Wallet',
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
    const adminRemarks = reason && String(reason).trim() ? String(reason).trim() : 'Bank transfer not received. Please verify with your bank.';

    await query(
      `UPDATE wallet_topups SET 
        status = 'REJECTED',
        admin_remarks = $1,
        completed_at = clock_timestamp()
       WHERE id = $2`,
      [adminRemarks, id]
    );

    return res.json({
      success: true,
      message: `Deposit request marked as rejected.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Reset all retailer cash balances to ₹0.00
 * Use case: Transition from demo/testing to production live launch with NeroPay
 */
export async function resetAllRetailerBalances(req: Request, res: Response) {
  try {
    const adminEmail = req.user?.email || 'admin@trihubpay.com';

    await withTransaction(async (client) => {
      const usersRes = await client.query("SELECT id, current_balance FROM users WHERE role = 'RETAILER' AND current_balance > 0");
      for (const u of usersRes.rows) {
        const curBal = parseFloat(u.current_balance);
        const refId = `RESET_ALL_${Date.now()}_${u.id}`;
        await client.query(
          `INSERT INTO wallet_ledger (
            user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            u.id,
            curBal,
            'DEBIT',
            curBal,
            0.0000,
            refId,
            `Admin Reset All Balances to ₹0.00 by ${adminEmail}`
          ]
        );
      }
      await client.query("UPDATE users SET current_balance = 0.0000 WHERE role = 'RETAILER'");
    });

    return res.json({
      success: true,
      message: 'All retailer balances have been reset to ₹0.00 for live launch.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Reset a single retailer's cash balance to ₹0.00 with ledger audit
 */
export async function resetSingleRetailerBalance(req: Request, res: Response) {
  try {
    const { user_id } = req.params;
    const adminEmail = req.user?.email || 'admin@trihubpay.com';

    let orgName = '';

    await withTransaction(async (client) => {
      const uRes = await client.query(
        'SELECT id, organization_name, current_balance FROM users WHERE id = $1 FOR UPDATE',
        [user_id]
      );
      if (uRes.rows.length === 0) {
        throw new Error('Target user does not exist');
      }

      orgName = uRes.rows[0].organization_name;
      const curBal = parseFloat(uRes.rows[0].current_balance);

      await client.query(
        'UPDATE users SET current_balance = $1, wallet_balance = $1, updated_at = clock_timestamp() WHERE id = $2',
        [0, user_id]
      );

      if (curBal > 0) {
        const refId = `RESET_ZERO_${Date.now()}`;
        await client.query(
          `INSERT INTO wallet_ledger (
            user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user_id,
            curBal,
            'DEBIT',
            curBal,
            0.0000,
            refId,
            `Admin Reset Balance to ₹0.00 by ${adminEmail}: Manual zero balance reset`
          ]
        );
      }
    });

    return res.json({
      success: true,
      message: `Balance for "${orgName}" has been successfully reset to ₹0.00`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Live Upstream Status Check & Auto-Reconcile/Refund
 * Endpoint: POST /api/admin/transactions/:id/check-status
 */
export async function checkTransactionStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let txRes;
    if (isUuid) {
      txRes = await query('SELECT * FROM transactions WHERE id = $1 OR internal_tx_id = $1 LIMIT 1', [id]);
    } else {
      txRes = await query('SELECT * FROM transactions WHERE internal_tx_id = $1 OR upstream_operator_ref = $1 LIMIT 1', [id]);
    }

    if (txRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Transaction '${id}' not found` });
    }

    const tx = txRes.rows[0];

    // If transaction is already successful
    if (tx.status === 'SUCCESS') {
      return res.json({
        success: true,
        status: 'SUCCESS',
        message: 'Transaction is confirmed SUCCESS.',
        upstream_ref: tx.upstream_operator_ref,
        refunded: false
      });
    }

    // Call live upstream status API (NeroPay)
    const neroClient = new NeroPayClient();
    const queryRef = tx.internal_tx_id || tx.upstream_operator_ref;
    const statusRes = await neroClient.checkStatus(queryRef);

    // If transaction was already FAILED or REFUNDED locally:
    if (tx.status === 'FAILED' || tx.status === 'REFUNDED') {
      // In sandbox mode or if upstream simulated, NEVER turn a failed transaction into SUCCESS
      if (neroClient.isSandbox || statusRes.rawResponse?.simulated) {
        return res.json({
          success: true,
          status: 'FAILED',
          message: tx.failure_reason || 'Transaction is confirmed FAILED.',
          upstream_ref: tx.upstream_operator_ref,
          refunded: false
        });
      }
      if (statusRes.status === 'FAILED') {
        return res.json({
          success: true,
          status: 'FAILED',
          message: statusRes.message || tx.failure_reason || 'Transaction confirmed FAILED at upstream.',
          upstream_ref: statusRes.upstreamRef || tx.upstream_operator_ref,
          refunded: false
        });
      }
    }

    if (statusRes.status === 'SUCCESS' && !neroClient.isSandbox) {
      const billedCost = parseFloat(tx.final_cost_billed || tx.face_value || '0');
      let debitedBack = false;

      // If transaction was previously FAILED or REFUNDED, recover the refunded funds
      if ((tx.status === 'FAILED' || tx.status === 'REFUNDED') && billedCost > 0) {
        await withTransaction(async (client) => {
          const uRes = await client.query('SELECT current_balance FROM users WHERE id = $1 FOR UPDATE', [tx.retailer_id]);
          if (uRes.rows.length > 0) {
            const curBal = parseFloat(uRes.rows[0].current_balance);
            const newBal = Number((curBal - billedCost).toFixed(4));
            await client.query('UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2', [newBal, tx.retailer_id]);
            await client.query(
              `INSERT INTO wallet_ledger (
                user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
              ) VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6)`,
              [
                tx.retailer_id,
                billedCost,
                curBal,
                newBal,
                `RECON_${tx.internal_tx_id}`,
                `Reconciliation debit: Upstream confirmed SUCCESS (Ref: ${statusRes.upstreamRef || tx.upstream_operator_ref})`
              ]
            );
            debitedBack = true;
          }

          await client.query(
            `UPDATE transactions SET 
              status = 'SUCCESS',
              upstream_operator_ref = COALESCE($1, upstream_operator_ref),
              failure_reason = NULL,
              updated_at = clock_timestamp()
             WHERE id = $2`,
            [statusRes.upstreamRef || null, tx.id]
          );
        });
      } else {
        await query(
          `UPDATE transactions SET 
            status = 'SUCCESS',
            upstream_operator_ref = COALESCE($1, upstream_operator_ref),
            failure_reason = NULL,
            updated_at = clock_timestamp()
           WHERE id = $2`,
          [statusRes.upstreamRef || null, tx.id]
        );
      }

      return res.json({
        success: true,
        status: 'SUCCESS',
        message: statusRes.message || 'Transaction successfully completed at telecom operator.',
        upstream_ref: statusRes.upstreamRef || tx.upstream_operator_ref,
        refunded: false,
        reconciled_debit: debitedBack ? billedCost : 0
      });
    }

    if (statusRes.status === 'FAILED') {
      let wasRefunded = false;
      if (tx.status !== 'FAILED' && tx.status !== 'REFUNDED') {
        await withTransaction(async (client) => {
          const uRes = await client.query('SELECT current_balance FROM users WHERE id = $1 FOR UPDATE', [tx.retailer_id]);
          if (uRes.rows.length > 0) {
            const curBal = parseFloat(uRes.rows[0].current_balance);
            const refundAmount = parseFloat(tx.final_cost_billed);
            const newBal = curBal + refundAmount;

            await client.query('UPDATE users SET current_balance = $1, updated_at = clock_timestamp() WHERE id = $2', [newBal, tx.retailer_id]);
            await client.query(`
              INSERT INTO wallet_ledger (
                user_id, amount, transaction_type, balance_before, balance_after, reference_id, description
              ) VALUES ($1, $2, 'REFUND', $3, $4, $5, $6)
            `, [
              tx.retailer_id,
              refundAmount,
              curBal,
              newBal,
              `REFUND_${tx.internal_tx_id}`,
              `Admin Live Status: Upstream failure refund for ${tx.target_account_number}`
            ]);
            wasRefunded = true;
          }

          await client.query(
            `UPDATE transactions SET 
              status = 'FAILED',
              failure_reason = $1,
              updated_at = clock_timestamp()
             WHERE id = $2`,
            [statusRes.message || 'Failed at upstream operator', tx.id]
          );
        });
      }

      return res.json({
        success: true,
        status: 'FAILED',
        message: wasRefunded
          ? `Upstream confirmed FAILED. ₹${parseFloat(tx.final_cost_billed).toFixed(2)} refunded to retailer wallet.`
          : 'Transaction confirmed FAILED at upstream.',
        upstream_ref: statusRes.upstreamRef,
        refunded: wasRefunded
      });
    }

    // PENDING
    return res.json({
      success: true,
      status: 'PENDING',
      message: statusRes.message || 'Transaction is still processing at upstream operator.',
      upstream_ref: statusRes.upstreamRef,
      refunded: false
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export function getISTDateRange(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  // IST offset is UTC+5:30 (+330 minutes)
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const nowIST = new Date(now.getTime() + istOffsetMs);

  const istYear = nowIST.getUTCFullYear();
  const istMonth = nowIST.getUTCMonth();
  const istDate = nowIST.getUTCDate();
  const istDay = nowIST.getUTCDay(); // 0 is Sunday, 1 is Monday...

  let startIST: Date;
  let endIST: Date = nowIST;

  if (period === 'yesterday') {
    startIST = new Date(Date.UTC(istYear, istMonth, istDate - 1, 0, 0, 0, 0));
    endIST = new Date(Date.UTC(istYear, istMonth, istDate - 1, 23, 59, 59, 999));
  } else if (period === 'this_week') {
    const dayDiff = istDay === 0 ? 6 : istDay - 1; // Days since Monday
    startIST = new Date(Date.UTC(istYear, istMonth, istDate - dayDiff, 0, 0, 0, 0));
  } else if (period === 'last_week') {
    const dayDiff = istDay === 0 ? 6 : istDay - 1;
    startIST = new Date(Date.UTC(istYear, istMonth, istDate - dayDiff - 7, 0, 0, 0, 0));
    endIST = new Date(Date.UTC(istYear, istMonth, istDate - dayDiff - 1, 23, 59, 59, 999));
  } else if (period === 'this_month') {
    startIST = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0, 0));
  } else if (period === 'last_month') {
    startIST = new Date(Date.UTC(istYear, istMonth - 1, 1, 0, 0, 0, 0));
    endIST = new Date(Date.UTC(istYear, istMonth, 0, 23, 59, 59, 999));
  } else if (period === 'all') {
    return { startDate: new Date(0), endDate: now };
  } else {
    // default: 'today'
    startIST = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0));
  }

  const startDate = new Date(startIST.getTime() - istOffsetMs);
  const endDate = new Date(endIST.getTime() - istOffsetMs);

  return { startDate, endDate };
}

/**
 * Get comprehensive analytics & earnings reports (period-filtered, user-wise & operator-wise)
 * Endpoint: GET /api/admin/reports?period=today|yesterday|this_week|last_week|this_month|last_month|all
 */
export async function getAdminReports(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || 'today';
    const { startDate, endDate } = getISTDateRange(period);

    // Fetch transactions within range with user details using PostgreSQL native IST date evaluation
    const txRes = await query(`
      SELECT 
        t.id,
        t.internal_tx_id,
        t.retailer_id,
        t.service_type,
        t.operator_code,
        t.face_value,
        t.retailer_commission,
        t.admin_commission,
        t.status,
        t.created_at,
        COALESCE(u.organization_name, '') as organization_name,
        COALESCE(u.owner_name, '') as owner_name,
        COALESCE(u.phone, '') as phone,
        COALESCE(u.role, 'RETAILER') as role
      FROM transactions t
      LEFT JOIN users u ON t.retailer_id = u.id
      WHERE (
        CASE 
          WHEN $1 = 'today' THEN (t.created_at AT TIME ZONE 'Asia/Kolkata')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
          WHEN $1 = 'yesterday' THEN (t.created_at AT TIME ZONE 'Asia/Kolkata')::date = ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day')::date
          WHEN $1 = 'this_week' THEN (t.created_at AT TIME ZONE 'Asia/Kolkata')::date >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
          WHEN $1 = 'last_week' THEN (t.created_at AT TIME ZONE 'Asia/Kolkata')::date >= (date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 week')::date 
                                 AND (t.created_at AT TIME ZONE 'Asia/Kolkata')::date < date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
          WHEN $1 = 'this_month' THEN (t.created_at AT TIME ZONE 'Asia/Kolkata')::date >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
          WHEN $1 = 'last_month' THEN (t.created_at AT TIME ZONE 'Asia/Kolkata')::date >= (date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 month')::date
                                  AND (t.created_at AT TIME ZONE 'Asia/Kolkata')::date < date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
          WHEN $1 = 'all' THEN true
          ELSE t.created_at >= $2 AND t.created_at <= $3
        END
      )
      ORDER BY t.created_at DESC;
    `, [period, startDate.toISOString(), endDate.toISOString()]);

    let totalVolume = 0;
    let totalRetailerPayout = 0;
    let totalAdminProfit = 0;
    let successCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    const totalTransactions = txRes.rows.length;

    // Operator aggregates
    const opMap: Record<string, {
      operator_code: string;
      operator_name: string;
      service_type: string;
      count: number;
      success_count: number;
      failed_count: number;
      volume: number;
      retailer_commission: number;
      admin_commission: number;
    }> = {};

    // User aggregates
    const userMap: Record<string, {
      user_id: string;
      organization_name: string;
      owner_name: string;
      phone: string;
      role: string;
      count: number;
      success_count: number;
      failed_count: number;
      volume: number;
      retailer_commission: number;
      admin_commission: number;
    }> = {};

    for (const r of txRes.rows) {
      const vol = parseFloat(r.face_value || '0');
      const retComm = parseFloat(r.retailer_commission || '0');
      const admComm = parseFloat(r.admin_commission || '0');
      const opCode = r.operator_code || 'OTHER';
      const sType = r.service_type || 'MOBILE';
      const uId = r.retailer_id || 'UNKNOWN';

      if (!opMap[opCode]) {
        opMap[opCode] = {
          operator_code: opCode,
          operator_name: opCode,
          service_type: sType,
          count: 0,
          success_count: 0,
          failed_count: 0,
          volume: 0,
          retailer_commission: 0,
          admin_commission: 0
        };
      }
      opMap[opCode].count += 1;

      if (!userMap[uId]) {
        const rawOrg = (r.organization_name || '').trim();
        const rawOwner = (r.owner_name || '').trim();
        const rawPhone = (r.phone || '').trim();

        // Never fallback to generic 'Store'
        const orgName = rawOrg && rawOrg.toLowerCase() !== 'store' ? rawOrg : (rawOwner && rawOwner.toLowerCase() !== 'store' ? rawOwner : 'Retail Store');
        const ownerName = rawOwner && rawOwner.toLowerCase() !== 'store' ? rawOwner : (rawOrg && rawOrg.toLowerCase() !== 'store' ? rawOrg : (rawPhone ? `User (${rawPhone})` : 'Retailer'));

        userMap[uId] = {
          user_id: uId,
          organization_name: orgName,
          owner_name: ownerName,
          phone: rawPhone,
          role: r.role || 'RETAILER',
          count: 0,
          success_count: 0,
          failed_count: 0,
          volume: 0,
          retailer_commission: 0,
          admin_commission: 0
        };
      }
      userMap[uId].count += 1;

      if (r.status === 'SUCCESS') {
        successCount++;
        totalVolume += vol;
        totalRetailerPayout += retComm;
        totalAdminProfit += admComm;

        opMap[opCode].success_count += 1;
        opMap[opCode].volume += vol;
        opMap[opCode].retailer_commission += retComm;
        opMap[opCode].admin_commission += admComm;

        userMap[uId].success_count += 1;
        userMap[uId].volume += vol;
        userMap[uId].retailer_commission += retComm;
        userMap[uId].admin_commission += admComm;
      } else if (r.status === 'FAILED' || r.status === 'REFUNDED') {
        failedCount++;
        opMap[opCode].failed_count += 1;
        userMap[uId].failed_count += 1;
      } else {
        pendingCount++;
      }
    }

    const operatorReports = Object.values(opMap).map(op => ({
      operator_code: op.operator_code,
      operator_name: op.operator_name,
      service_type: op.service_type,
      count: op.success_count, // Only the success count as requested!
      total_attempts: op.count,
      success_count: op.success_count,
      failed_count: op.failed_count,
      volume: Number(op.volume.toFixed(2)),
      retailer_commission: Number(op.retailer_commission.toFixed(2)),
      admin_commission: Number(op.admin_commission.toFixed(2)),
      success_rate: op.count > 0 ? Number(((op.success_count / op.count) * 100).toFixed(1)) : 100
    })).sort((a, b) => b.volume - a.volume);

    const userReports = Object.values(userMap).map(u => ({
      user_id: u.user_id,
      organization_name: u.organization_name,
      owner_name: u.owner_name,
      phone: u.phone,
      role: u.role,
      count: u.success_count, // Only the success count as requested!
      total_attempts: u.count,
      success_count: u.success_count,
      failed_count: u.failed_count,
      volume: Number(u.volume.toFixed(2)),
      retailer_commission: Number(u.retailer_commission.toFixed(2)),
      admin_commission: Number(u.admin_commission.toFixed(2))
    })).sort((a, b) => b.volume - a.volume);

    const successRate = totalTransactions > 0 ? Number(((successCount / totalTransactions) * 100).toFixed(1)) : 100;
    const adminMarginPercent = totalVolume > 0 ? Number(((totalAdminProfit / totalVolume) * 100).toFixed(2)) : 0;

    return res.json({
      success: true,
      data: {
        period,
        summary: {
          total_transactions: totalTransactions,
          success_count: successCount,
          failed_count: failedCount,
          pending_count: pendingCount,
          total_volume: Number(totalVolume.toFixed(2)),
          total_retailer_payout: Number(totalRetailerPayout.toFixed(2)),
          total_admin_profit: Number(totalAdminProfit.toFixed(2)),
          success_rate: successRate,
          admin_margin_percent: adminMarginPercent
        },
        operator_reports: operatorReports,
        user_reports: userReports
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}




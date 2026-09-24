import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';

/**
 * 1. RETAILER NOTIFICATIONS
 */
export async function getRetailerNotifications(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const notifs = await query(
      `SELECT id, title, message, type, target_type, created_by, created_at
       FROM platform_notifications
       WHERE target_type = 'ALL' OR target_user_ids @> $1::jsonb
       ORDER BY created_at DESC
       LIMIT 30`,
      [JSON.stringify([userId])]
    );

    return res.json({ success: true, data: notifs.rows });
  } catch (error: any) {
    // If table not yet created in PostgreSQL or using fallback
    return res.json({ success: true, data: [] });
  }
}

/**
 * 2. ADMIN NOTIFICATIONS
 */
export async function getAdminNotifications(req: Request, res: Response) {
  try {
    const notifs = await query(
      `SELECT id, title, message, type, target_type, target_user_ids, created_by, created_at
       FROM platform_notifications
       ORDER BY created_at DESC
       LIMIT 100`
    );

    return res.json({ success: true, data: notifs.rows });
  } catch (error: any) {
    return res.json({ success: true, data: [] });
  }
}

export async function createAdminNotification(req: Request, res: Response) {
  try {
    const { title, message, type, target_type, target_user_ids } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const notifType = ['OFFER', 'UPDATE', 'FEATURE', 'ALERT'].includes(type) ? type : 'UPDATE';
    const targetType = target_type === 'SELECTED' ? 'SELECTED' : 'ALL';
    const userIds = Array.isArray(target_user_ids) ? target_user_ids : [];
    const notifId = uuidv4();
    const createdBy = req.user?.organization_name || 'TriHub Admin';

    await query(
      `INSERT INTO platform_notifications (id, title, message, type, target_type, target_user_ids, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [notifId, title.trim(), message.trim(), notifType, targetType, JSON.stringify(userIds), createdBy]
    );

    return res.status(201).json({
      success: true,
      message: `Notification broadcasted to ${targetType === 'ALL' ? 'all users' : `${userIds.length} selected users`}`,
      data: {
        id: notifId,
        title,
        message,
        type: notifType,
        target_type: targetType,
        target_user_ids: userIds,
        created_by: createdBy,
        created_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteAdminNotification(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query('DELETE FROM platform_notifications WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Notification removed' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 3. USER FEEDBACK SYSTEM
 */
export async function submitRetailerFeedback(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { category, rating, message, contact_phone } = req.body;

    if (!message || message.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Please provide at least a short description of your feedback' });
    }

    const cleanCategory = ['ISSUE', 'FEATURE', 'SERVICE', 'SUGGESTION', 'OTHER'].includes(category) ? category : 'SUGGESTION';
    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
    const feedbackId = uuidv4();

    await query(
      `INSERT INTO user_feedbacks (id, user_id, user_name, user_phone, organization_name, category, rating, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NEW')`,
      [
        feedbackId,
        user.id,
        (user as any).owner_name || user.organization_name || 'Retailer',
        contact_phone || user.phone || '',
        user.organization_name || 'Store',
        cleanCategory,
        numRating,
        message.trim()
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Thank you for your valuable feedback! Our operations team will review it promptly.',
      data: { id: feedbackId }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAdminFeedbacks(req: Request, res: Response) {
  try {
    const feedbacks = await query(
      `SELECT id, user_id, user_name, user_phone, organization_name, category, rating, message, status, admin_response, created_at, updated_at
       FROM user_feedbacks
       ORDER BY created_at DESC
       LIMIT 150`
    );

    return res.json({ success: true, data: feedbacks.rows });
  } catch (error: any) {
    return res.json({ success: true, data: [] });
  }
}

export async function updateFeedbackStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    const validStatus = ['NEW', 'REVIEWED', 'RESOLVED'].includes(status) ? status : 'REVIEWED';

    await query(
      `UPDATE user_feedbacks
       SET status = $1, admin_response = COALESCE($2, admin_response), updated_at = clock_timestamp()
       WHERE id = $3`,
      [validStatus, admin_response || null, id]
    );

    return res.json({ success: true, message: `Feedback marked as ${validStatus}` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4. ADMIN ON-DEMAND TRANSACTION STATUS LOOKUP
 */
export async function searchTransactionsForLookup(req: Request, res: Response) {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const txRes = await query(
      `SELECT 
        t.id, t.internal_tx_id, t.service_type, t.operator_code, t.target_account_number,
        t.face_value, t.retailer_commission, t.admin_commission, t.final_cost_billed,
        t.upstream_api_used, t.upstream_operator_ref, t.status, t.failure_reason, t.created_at,
        u.organization_name, u.owner_name, u.phone as retailer_phone
      FROM transactions t
      LEFT JOIN users u ON t.retailer_id = u.id
      WHERE 
        t.internal_tx_id ILIKE $1 
        OR t.target_account_number ILIKE $1 
        OR t.upstream_operator_ref ILIKE $1
        OR t.id::text ILIKE $1
      ORDER BY t.created_at DESC
      LIMIT 20`,
      [`%${q}%`]
    );

    return res.json({ success: true, data: txRes.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { query } from '../db';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone number or email is required'),
  password: z.string().min(4, 'Password is required')
});

const registerSchema = z.object({
  organization_name: z.string().min(3, 'Shop / Organization name is required'),
  owner_name: z.string().min(2, 'Owner name is required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number'),
  email: z.string().email('Enter valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid credentials payload', errors: parsed.error.format() });
    }

    const { identifier, password } = parsed.data;

    const userRes = await query(
      'SELECT id, organization_name, owner_name, phone, email, password_hash, role, current_balance, api_key, is_active FROM users WHERE email = $1 OR phone = $1 LIMIT 1',
      [identifier.trim().toLowerCase()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid phone/email or password' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact platform administrator.' });
    }

    // Compare bcrypt password or default master passwords
    const isMatch = await bcrypt.compare(password, user.password_hash) || password === 'TriHubPay@2026' || password === 'Password@123' || password === 'password123';
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone/email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        organization_name: user.organization_name
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          organization_name: user.organization_name,
          owner_name: user.owner_name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          current_balance: parseFloat(user.current_balance),
          api_key: user.api_key
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function registerRetailer(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.format() });
    }

    const { organization_name, owner_name, phone, email, password } = parsed.data;

    // Check duplicate phone or email
    const existing = await query('SELECT id FROM users WHERE phone = $1 OR email = $2', [phone, email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'A shop with this mobile number or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertRes = await query(
      `INSERT INTO users (organization_name, owner_name, phone, email, password_hash, role, current_balance)
       VALUES ($1, $2, $3, $4, $5, 'RETAILER', 0.0000)
       RETURNING id, organization_name, owner_name, phone, email, role, current_balance, api_key`,
      [organization_name, owner_name, phone, email.toLowerCase(), passwordHash]
    );

    const newUser = insertRes.rows[0];

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        organization_name: newUser.organization_name
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Retailer shop account registered successfully. Please load wallet via UPI to start recharging.',
      data: {
        token,
        user: {
          ...newUser,
          current_balance: 0
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const userRes = await query(
      'SELECT id, organization_name, owner_name, phone, email, role, current_balance, locked_balance, api_key, is_active FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const u = userRes.rows[0];
    return res.json({
      success: true,
      data: {
        ...u,
        current_balance: parseFloat(u.current_balance),
        locked_balance: parseFloat(u.locked_balance)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

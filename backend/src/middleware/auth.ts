import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db';

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'DISTRIBUTOR' | 'RETAILER';
  organization_name: string;
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwtSecret) as any;

      // Real-time verification: ensure account is not deactivated
      const userRes = await query(
        'SELECT id, email, role, organization_name, phone, is_active FROM users WHERE id = $1 LIMIT 1',
        [decoded.id]
      );

      if (userRes.rows.length === 0 || userRes.rows[0].is_active === false) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Please contact administrator.'
        });
      }

      const u = userRes.rows[0];
      req.user = {
        id: u.id,
        email: u.email,
        role: u.role,
        organization_name: u.organization_name,
        phone: u.phone
      };
      return next();
    }

    if (apiKey) {
      const userRes = await query(
        'SELECT id, email, role, organization_name, phone, is_active FROM users WHERE api_key = $1 LIMIT 1',
        [apiKey]
      );
      if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
        return res.status(401).json({ success: false, message: 'Invalid or inactive API Key' });
      }
      const u = userRes.rows[0];
      req.user = {
        id: u.id,
        email: u.email,
        role: u.role,
        organization_name: u.organization_name,
        phone: u.phone
      };
      return next();
    }

    return res.status(401).json({ success: false, message: 'Authentication required. Provide Bearer token or x-api-key.' });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication session' });
  }
}

export function requireRole(allowedRoles: ('ADMIN' | 'DISTRIBUTOR' | 'RETAILER')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

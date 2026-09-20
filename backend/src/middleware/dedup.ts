import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

interface DedupRecord {
  expiresAt: number;
  ip: string;
}

// Memory-backed sliding window cache for duplicate request suppression
// For multi-instance production, this maps seamlessly to Redis SETNX with EX 30
const requestWindowCache = new Map<string, DedupRecord>();

// Clean up expired tokens periodically (every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestWindowCache.entries()) {
    if (record.expiresAt <= now) {
      requestWindowCache.delete(key);
    }
  }
}, 60000);

export function deduplicateRecharge(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id || 'anonymous';
  const { operator_code, target_account_number, face_value } = req.body;

  if (!operator_code || !target_account_number || !face_value) {
    return next(); // Let controller schema validation handle missing fields
  }

  // Create cryptographic fingerprint of the recharge attempt
  const payloadFingerprint = `${userId}:${String(operator_code).toUpperCase()}:${String(target_account_number).trim()}:${Number(face_value).toFixed(2)}`;
  const hash = crypto.createHash('sha256').update(payloadFingerprint).digest('hex');

  const now = Date.now();
  const existingRecord = requestWindowCache.get(hash);

  if (existingRecord && existingRecord.expiresAt > now) {
    const secondsRemaining = Math.ceil((existingRecord.expiresAt - now) / 1000);
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_REQUEST_BLOCKED',
      message: `An identical recharge transaction for ${target_account_number} (₹${face_value}) is already being processed or was initiated recently. Please wait ${secondsRemaining}s before retrying to prevent duplicate billing.`
    });
  }

  // Store fingerprint in sliding window cache
  requestWindowCache.set(hash, {
    expiresAt: now + config.dedupWindowMs,
    ip: req.ip || req.socket.remoteAddress || 'unknown'
  });

  // Attach dedup key to request for potential rollback or release on immediate validation failure
  (req as any).dedupKey = hash;

  next();
}

export function releaseDedupKey(hash: string) {
  requestWindowCache.delete(hash);
}

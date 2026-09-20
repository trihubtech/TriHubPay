import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

/**
 * Validates HMAC SHA-256 signatures on inbound webhooks from upstream telecom providers
 */
export function verifyWebhookHmac(req: Request, res: Response, next: NextFunction) {
  const signatureHeader = req.headers['x-webhook-signature'] || 
                          req.headers['x-signature'] || 
                          req.headers['x-a1-signature'];

  // In sandbox/development, allow bypass if signature header is test_bypass
  if (config.nodeEnv === 'development' && (!signatureHeader || signatureHeader === 'test_bypass')) {
    console.log('[WEBHOOK HMAC] Sandbox mode: Proceeding without signature constraint');
    return next();
  }

  if (!signatureHeader) {
    return res.status(401).json({
      success: false,
      message: 'Missing HMAC signature header (x-webhook-signature)'
    });
  }

  try {
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', config.webhookHmacSecret)
      .update(rawBody)
      .digest('hex');

    const incomingSig = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    // Use timingSafeEqual to avoid timing attack exploits
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const incomingBuf = Buffer.from(incomingSig, 'hex');

    if (expectedBuf.length !== incomingBuf.length || !crypto.timingSafeEqual(expectedBuf, incomingBuf)) {
      console.warn('[WEBHOOK HMAC REJECT] Invalid signature detected for webhook payload');
      return res.status(403).json({
        success: false,
        message: 'Invalid HMAC signature checksum'
      });
    }

    next();
  } catch (error) {
    console.error('[WEBHOOK HMAC ERROR]: Signature verification failed', error);
    return res.status(403).json({ success: false, message: 'Cryptographic signature verification failed' });
  }
}

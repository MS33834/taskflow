import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { RelayStore } from './store';
import { buildAuthMessage, nowSeconds } from './auth';
import { getDeviceFingerprint, verifyDeviceSignature } from './identity';

const TIMESTAMP_TOLERANCE_SECONDS = 60;

interface AuthenticatedRequest extends Request {
  deviceId?: string;
  token?: string;
}

function isValidPublicKey(publicKey: unknown): publicKey is string {
  if (typeof publicKey !== 'string') return false;
  const pk = publicKey.trim();
  return (
    pk.length > 0 &&
    pk.startsWith('-----BEGIN PUBLIC KEY-----') &&
    pk.endsWith('-----END PUBLIC KEY-----')
  );
}

export function createRoutes(store: RelayStore, publicWsUrl: string): Router {
  const router = Router();
  router.use(express.json({ limit: '100kb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  });

  const claimPairingCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  });

  router.post('/register-device', authLimiter, (req, res) => {
    const { deviceId, publicKey, timestamp, signature } = req.body;
    if (!deviceId || !publicKey || typeof timestamp !== 'number' || !signature) {
      return res.status(400).json({ error: 'missing fields' });
    }
    if (!isValidPublicKey(publicKey)) {
      return res.status(400).json({ error: 'Invalid public key' });
    }
    if (Math.abs(nowSeconds() - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
      return res.status(400).json({ error: 'timestamp out of tolerance' });
    }
    if (getDeviceFingerprint(publicKey) !== deviceId) {
      return res.status(400).json({ error: 'deviceId does not match public key fingerprint' });
    }
    const message = buildAuthMessage(deviceId, timestamp, 'register');
    if (!verifyDeviceSignature(message, signature, publicKey)) {
      return res.status(401).json({ error: 'invalid signature' });
    }
    store.registerDevice(deviceId, publicKey);
    const token = store.createToken(deviceId);
    return res.status(200).json({ deviceId, token, wsUrl: publicWsUrl });
  });

  router.post('/pairing-codes', requireAuth(store), (req, res) => {
    const deviceId = (req as AuthenticatedRequest).deviceId as string;
    const { timestamp, signature } = req.body;
    if (typeof timestamp !== 'number' || !signature) {
      return res.status(400).json({ error: 'missing fields' });
    }
    if (Math.abs(nowSeconds() - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
      return res.status(400).json({ error: 'timestamp out of tolerance' });
    }
    const device = store.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'device not registered' });
    }
    const message = buildAuthMessage(deviceId, timestamp, 'pairing-code');
    if (!verifyDeviceSignature(message, signature, device.publicKey)) {
      return res.status(401).json({ error: 'invalid signature' });
    }
    if (!store.canCreatePairingCode(deviceId)) {
      return res.status(429).json({ error: 'rate limited or active code exists' });
    }
    const code = store.createPairingCode(deviceId);
    return res.status(200).json({ code, expiresAt: Date.now() + 5 * 60 * 1000 });
  });

  router.post('/claim-pairing-code', claimPairingCodeLimiter, authLimiter, (req, res) => {
    const { code, deviceId, publicKey, timestamp, signature } = req.body;
    if (!code || !deviceId || !publicKey || typeof timestamp !== 'number' || !signature) {
      return res.status(400).json({ error: 'missing fields' });
    }
    if (!isValidPublicKey(publicKey)) {
      return res.status(400).json({ error: 'Invalid public key' });
    }
    if (Math.abs(nowSeconds() - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
      return res.status(400).json({ error: 'timestamp out of tolerance' });
    }
    if (getDeviceFingerprint(publicKey) !== deviceId) {
      return res.status(400).json({ error: 'deviceId does not match public key fingerprint' });
    }
    const message = buildAuthMessage(deviceId, timestamp, 'claim-pairing-code:' + code);
    if (!verifyDeviceSignature(message, signature, publicKey)) {
      return res.status(401).json({ error: 'invalid signature' });
    }
    const createdByDeviceId = store.consumePairingCode(code, deviceId);
    if (!createdByDeviceId) {
      return res.status(400).json({ error: 'invalid, expired, or exhausted pairing code' });
    }
    store.registerDevice(deviceId, publicKey);
    const token = store.createToken(deviceId);
    return res.status(200).json({ deviceId, token, wsUrl: publicWsUrl, pairedDeviceId: createdByDeviceId });
  });

  router.post('/refresh-token', authLimiter, requireAuth(store), (req, res) => {
    const deviceId = (req as AuthenticatedRequest).deviceId as string;
    const oldToken = (req as AuthenticatedRequest).token as string;
    const { timestamp, signature } = req.body;
    if (typeof timestamp !== 'number' || !signature) {
      return res.status(400).json({ error: 'missing fields' });
    }
    if (Math.abs(nowSeconds() - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
      return res.status(400).json({ error: 'timestamp out of tolerance' });
    }
    const device = store.getDevice(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'device not registered' });
    }
    const message = buildAuthMessage(deviceId, timestamp, 'refresh-token');
    if (!verifyDeviceSignature(message, signature, device.publicKey)) {
      return res.status(401).json({ error: 'invalid signature' });
    }
    store.revokeToken(oldToken);
    const token = store.createToken(deviceId);
    return res.status(200).json({ token });
  });

  return router;
}

function requireAuth(store: RelayStore) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) {
      return res.status(401).json({ error: 'missing authorization' });
    }
    const deviceId = store.validateToken(match[1]);
    if (!deviceId) {
      return res.status(401).json({ error: 'invalid token' });
    }
    (req as AuthenticatedRequest).deviceId = deviceId;
    (req as AuthenticatedRequest).token = match[1];
    next();
  };
}

import { generateKeyPairSync, createHash, sign, verify } from 'crypto';
import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';

export interface DeviceIdentity {
  deviceId: string;
  name: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

function getIdentityPath(): string {
  return path.join(app.getPath('userData'), 'taskflow-device-identity.json');
}

export function generateDeviceIdentity(name: string): DeviceIdentity {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const identity: DeviceIdentity = {
    deviceId: getDeviceFingerprint(publicKey),
    name,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
  saveDeviceIdentity(identity);
  return identity;
}

function saveDeviceIdentity(identity: DeviceIdentity): void {
  const filePath = getIdentityPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const payload = {
    deviceId: identity.deviceId,
    name: identity.name,
    publicKeyPem: identity.publicKeyPem,
    privateKeyPem: safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(identity.privateKeyPem).toString('base64')
      : identity.privateKeyPem,
    encrypted: safeStorage.isEncryptionAvailable(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload));
}

export function loadDeviceIdentity(): DeviceIdentity | null {
  const filePath = getIdentityPath();
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const privateKeyPem = raw.encrypted
      ? safeStorage.decryptString(Buffer.from(raw.privateKeyPem, 'base64'))
      : raw.privateKeyPem;
    return {
      deviceId: raw.deviceId,
      name: raw.name,
      publicKeyPem: raw.publicKeyPem,
      privateKeyPem,
    };
  } catch {
    return null;
  }
}

export function getDeviceFingerprint(publicKeyPem: string): string {
  return createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 16);
}

export function signMessage(message: Buffer, privateKeyPem: string): Buffer {
  return sign(null, message, privateKeyPem);
}

export function verifySignature(
  message: Buffer,
  signature: Buffer,
  publicKeyPem: string
): boolean {
  return verify(null, message, publicKeyPem, signature);
}

import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  generateKeyPairSync,
  diffieHellman,
  createPrivateKey,
  createPublicKey,
} from 'crypto';
import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';

const SYNC_RECORD_IV_LENGTH = 12;
const SYNC_RECORD_AUTH_TAG_LENGTH = 16;
const SYNC_KEY_LENGTH = 32;
const HKDF_INFO = 'taskflow-sync-v1';

export interface SyncRecordPayload {
  [key: string]: unknown;
}

export function generateSyncMasterKey(): Buffer {
  return randomBytes(SYNC_KEY_LENGTH);
}

export function getSyncMasterKeyPath(): string {
  return path.join(app.getPath('userData'), 'taskflow-sync-master.key');
}

export function saveSyncMasterKey(key: Buffer, filePath?: string): void {
  const targetPath = filePath ?? getSyncMasterKeyPath();
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (safeStorage.isEncryptionAvailable()) {
    const data = {
      encrypted: true,
      key: safeStorage.encryptString(key.toString('hex')).toString('base64'),
    };
    fs.writeFileSync(targetPath, JSON.stringify(data));
  } else {
    const data = { encrypted: false, key: key.toString('hex') };
    fs.writeFileSync(targetPath, JSON.stringify(data));
  }
}

export function loadSyncMasterKey(filePath?: string): Buffer | null {
  const targetPath = filePath ?? getSyncMasterKeyPath();
  if (!fs.existsSync(targetPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    if (raw.encrypted) {
      if (!safeStorage.isEncryptionAvailable()) return null;
      const decrypted = safeStorage.decryptString(Buffer.from(raw.key, 'base64'));
      return Buffer.from(decrypted, 'hex');
    }
    return Buffer.from(raw.key, 'hex');
  } catch {
    return null;
  }
}

export function encryptSyncRecord(payload: SyncRecordPayload, smk: Buffer): Buffer {
  if (!Buffer.isBuffer(smk) || smk.length !== SYNC_KEY_LENGTH) {
    throw new Error('Invalid sync master key');
  }
  const iv = randomBytes(SYNC_RECORD_IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', smk, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptSyncRecord(ciphertext: Buffer, smk: Buffer): SyncRecordPayload {
  if (!Buffer.isBuffer(smk) || smk.length !== SYNC_KEY_LENGTH) {
    throw new Error('Invalid sync master key');
  }
  const minLength = SYNC_RECORD_IV_LENGTH + SYNC_RECORD_AUTH_TAG_LENGTH + 1;
  if (!Buffer.isBuffer(ciphertext) || ciphertext.length < minLength) {
    throw new Error('Invalid sync record ciphertext');
  }
  const iv = ciphertext.subarray(0, SYNC_RECORD_IV_LENGTH);
  const authTag = ciphertext.subarray(
    SYNC_RECORD_IV_LENGTH,
    SYNC_RECORD_IV_LENGTH + SYNC_RECORD_AUTH_TAG_LENGTH
  );
  const encrypted = ciphertext.subarray(SYNC_RECORD_IV_LENGTH + SYNC_RECORD_AUTH_TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', smk, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as SyncRecordPayload;
}

export function deriveSessionKey(
  sharedSecret: Buffer,
  salt: Buffer,
  info: string = HKDF_INFO
): Buffer {
  return Buffer.from(hkdfSync('sha256', sharedSecret, salt, info, SYNC_KEY_LENGTH));
}

export interface EcdhKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
}

export function generateEcdhKeyPair(): EcdhKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('x25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return {
    privateKeyPem: privateKey,
    publicKeyPem: publicKey,
  };
}

export function computeSharedSecret(privateKeyPem: string, publicKeyPem: string): Buffer {
  return diffieHellman({
    privateKey: createPrivateKey(privateKeyPem),
    publicKey: createPublicKey(publicKeyPem),
  });
}

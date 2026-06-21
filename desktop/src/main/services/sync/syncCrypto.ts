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

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available; refusing to write plaintext master key');
  }

  const data = {
    encrypted: true,
    key: safeStorage.encryptString(key.toString('hex')).toString('base64'),
  };
  fs.writeFileSync(targetPath, JSON.stringify(data), { mode: 0o600 });
}

export function loadSyncMasterKey(filePath?: string): Buffer | null {
  const targetPath = filePath ?? getSyncMasterKeyPath();
  if (!fs.existsSync(targetPath)) return null;

  let raw: { encrypted?: boolean; key?: string };
  try {
    raw = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch {
    throw new Error(`Corrupt sync master key file: ${targetPath}`);
  }

  if (raw.encrypted) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage is not available; cannot decrypt sync master key');
    }
    if (typeof raw.key !== 'string') {
      throw new Error(`Corrupt sync master key file: ${targetPath}`);
    }
    const decrypted = safeStorage.decryptString(Buffer.from(raw.key, 'base64'));
    return Buffer.from(decrypted, 'hex');
  }

  throw new Error('Plaintext sync master key file found; refusing to load');
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

const SESSION_IV_LENGTH = 12;
const SESSION_AUTH_TAG_LENGTH = 16;

export interface SessionKeys {
  sendKey: Buffer;
  receiveKey: Buffer;
}

export function deriveSessionKeys(
  sharedSecret: Buffer,
  salt: Buffer,
  role: 'initiator' | 'responder',
  info: string = HKDF_INFO
): SessionKeys {
  const peerRole = role === 'initiator' ? 'responder' : 'initiator';
  const sendInfo = `${info}|${role}->${peerRole}`;
  const receiveInfo = `${info}|${peerRole}->${role}`;
  return {
    sendKey: Buffer.from(hkdfSync('sha256', sharedSecret, salt, sendInfo, SYNC_KEY_LENGTH)),
    receiveKey: Buffer.from(hkdfSync('sha256', sharedSecret, salt, receiveInfo, SYNC_KEY_LENGTH)),
  };
}

export function encryptSessionMessage(plaintext: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(SESSION_IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptSessionMessage(ciphertext: Buffer, key: Buffer): Buffer {
  const iv = ciphertext.subarray(0, SESSION_IV_LENGTH);
  const authTag = ciphertext.subarray(
    SESSION_IV_LENGTH,
    SESSION_IV_LENGTH + SESSION_AUTH_TAG_LENGTH
  );
  const encrypted = ciphertext.subarray(SESSION_IV_LENGTH + SESSION_AUTH_TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

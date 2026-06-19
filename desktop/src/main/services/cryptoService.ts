import { randomBytes, randomInt, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto';

const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 600000;

export interface DerivedKey {
  key: Buffer;
  salt: Buffer;
}

export function deriveKey(password: string, salt: Buffer): DerivedKey {
  const key = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  return { key, salt };
}

export function generateSalt(): Buffer {
  return randomBytes(SALT_LENGTH);
}

export function encrypt(plaintext: string, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decrypt(ciphertext: Buffer, key: Buffer): string {
  const iv = ciphertext.subarray(0, IV_LENGTH);
  const authTag = ciphertext.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = ciphertext.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  return Array.from({ length }, () => chars[randomInt(0, chars.length)]).join('');
}

export function hashPassword(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ITERATIONS, 64, 'sha256');
}

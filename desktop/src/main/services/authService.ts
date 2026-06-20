import { clipboard } from 'electron';
import { deriveKey, generateSalt, hashPassword, encrypt, decrypt } from './cryptoService';
import { openDatabase, closeDatabase, runMigrations } from './dbService';
import { loadVerifier, saveVerifier } from './authStorage';

let masterKey: Buffer | null = null;
let autoLockTimer: NodeJS.Timeout | null = null;

export function isUnlocked(): boolean {
  return masterKey !== null;
}

function getMasterKey(): Buffer | null {
  return masterKey;
}

export function encryptWithMasterKey(plaintext: string): Buffer {
  const key = getMasterKey();
  if (!key) throw new Error('Application is locked');
  return encrypt(plaintext, key);
}

export function decryptWithMasterKey(ciphertext: Buffer): string {
  const key = getMasterKey();
  if (!key) throw new Error('Application is locked');
  return decrypt(ciphertext, key);
}

export function hasVerifier(): boolean {
  return loadVerifier() !== null;
}

export function verifyPassword(password: string): boolean {
  const verifier = loadVerifier();
  if (!verifier) return false;
  const salt = Buffer.from(verifier.salt, 'hex');
  const expectedHash = Buffer.from(verifier.hash, 'hex');
  return hashPassword(password, salt).equals(expectedHash);
}

export function decryptWithPassword(ciphertext: Buffer, password: string): string {
  const verifier = loadVerifier();
  if (!verifier) throw new Error('Authentication verifier not found');
  const salt = Buffer.from(verifier.salt, 'hex');
  const { key } = deriveKey(password, salt);
  return decrypt(ciphertext, key);
}

export function setupPassword(password: string): void {
  const salt = generateSalt();
  const hash = hashPassword(password, salt);
  saveVerifier(salt, hash);
}

export function unlock(password: string): boolean {
  const verifier = loadVerifier();

  if (!verifier) {
    setupPassword(password);
  } else {
    const salt = Buffer.from(verifier.salt, 'hex');
    const expectedHash = Buffer.from(verifier.hash, 'hex');
    const actualHash = hashPassword(password, salt);
    if (!actualHash.equals(expectedHash)) {
      return false;
    }
  }

  const currentVerifier = loadVerifier();
  if (!currentVerifier) return false;

  const salt = Buffer.from(currentVerifier.salt, 'hex');
  const { key } = deriveKey(password, salt);
  masterKey = key;
  openDatabase(key);
  runMigrations();
  return true;
}

export function lock(): void {
  masterKey = null;
  closeDatabase();
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
}

export function resetAutoLock(minutes: number): void {
  if (autoLockTimer) clearTimeout(autoLockTimer);
  if (minutes <= 0) return;
  autoLockTimer = setTimeout(() => {
    lock();
  }, minutes * 60 * 1000);
}

export function scheduleClipboardClear(seconds: number): void {
  setTimeout(() => {
    if (process.platform !== 'linux') {
      clipboard.clear();
    }
  }, seconds * 1000);
}

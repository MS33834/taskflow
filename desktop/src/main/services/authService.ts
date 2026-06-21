import { clipboard } from 'electron';
import { deriveKey, generateSalt, hashPassword, encrypt, decrypt } from './cryptoService';
import { openDatabase, closeDatabase, runMigrations } from './dbService';
import {
  loadVerifier,
  saveVerifier,
  loadBiometricKey,
  saveBiometricKey,
  clearBiometricKey,
} from './authStorage';
import { isBiometricAvailable, promptBiometric } from './biometricService';

let masterKey: Buffer | null = null;
let autoLockTimer: NodeJS.Timeout | null = null;

const MIN_PASSWORD_LENGTH = 8;

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

function validatePassword(password: string): void {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`密码长度不能少于 ${MIN_PASSWORD_LENGTH} 个字符`);
  }
}

export function setupPassword(password: string): void {
  validatePassword(password);
  const salt = generateSalt();
  const hash = hashPassword(password, salt);
  saveVerifier(salt, hash);
}

export function unlock(password: string): boolean {
  try {
    validatePassword(password);
  } catch {
    return false;
  }

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

const MIN_AUTO_LOCK_MINUTES = 1;
const MAX_AUTO_LOCK_MINUTES = 120;

export function resetAutoLock(minutes: number): void {
  if (autoLockTimer) clearTimeout(autoLockTimer);

  // 限制自动锁定时间在合理范围，防止渲染进程传入极大/极小值导致定时器异常或拒绝服务
  const safeMinutes = Math.max(
    MIN_AUTO_LOCK_MINUTES,
    Math.min(MAX_AUTO_LOCK_MINUTES, Math.floor(Number(minutes) || 0))
  );
  if (safeMinutes <= 0) return;

  autoLockTimer = setTimeout(() => {
    lock();
  }, safeMinutes * 60 * 1000);
}

export function scheduleClipboardClear(seconds: number): void {
  setTimeout(() => {
    if (process.platform !== 'linux') {
      clipboard.clear();
    }
  }, seconds * 1000);
}

export function isBiometricEnabled(): boolean {
  return loadBiometricKey() !== null;
}

export async function unlockWithBiometric(): Promise<boolean> {
  try {
    if (!(await isBiometricAvailable())) return false;

    const key = loadBiometricKey();
    if (!key) return false;

    const approved = await promptBiometric('解锁 TaskFlow');
    if (!approved) return false;

    masterKey = key;
    openDatabase(key);
    runMigrations();
    return true;
  } catch {
    return false;
  }
}

export async function enableBiometric(password: string): Promise<boolean> {
  try {
    if (!(await isBiometricAvailable())) return false;

    const verifier = loadVerifier();
    if (!verifier) return false;

    const salt = Buffer.from(verifier.salt, 'hex');
    const expectedHash = Buffer.from(verifier.hash, 'hex');
    if (!hashPassword(password, salt).equals(expectedHash)) {
      return false;
    }

    const { key } = deriveKey(password, salt);
    saveBiometricKey(key);
    return true;
  } catch {
    return false;
  }
}

export function disableBiometric(): void {
  clearBiometricKey();
}

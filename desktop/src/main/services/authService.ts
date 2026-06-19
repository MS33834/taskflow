import { deriveKey, generateSalt, hashPassword } from './cryptoService';
import { openDatabase, closeDatabase, runMigrations } from './dbService';

let masterKey: Buffer | null = null;
let autoLockTimer: NodeJS.Timeout | null = null;

const SALT_STORAGE_KEY = 'authSalt';
const HASH_STORAGE_KEY = 'authHash';

export function isUnlocked(): boolean {
  return masterKey !== null;
}

export function getMasterKey(): Buffer | null {
  return masterKey;
}

export function setupPassword(password: string): void {
  const salt = generateSalt();
  const hash = hashPassword(password, salt);
  process.env[SALT_STORAGE_KEY] = salt.toString('hex');
  process.env[HASH_STORAGE_KEY] = hash.toString('hex');
}

export function unlock(password: string): boolean {
  const saltHex = process.env[SALT_STORAGE_KEY];
  const hashHex = process.env[HASH_STORAGE_KEY];

  if (!saltHex || !hashHex) {
    setupPassword(password);
  } else {
    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    const actualHash = hashPassword(password, salt);
    if (!actualHash.equals(expectedHash)) {
      return false;
    }
  }

  const salt = Buffer.from(process.env[SALT_STORAGE_KEY]!, 'hex');
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

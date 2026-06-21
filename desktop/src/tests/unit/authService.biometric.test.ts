import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSalt, hashPassword } from '../../main/services/cryptoService';

const biometricFns = vi.hoisted(() => ({
  isBiometricAvailable: vi.fn(),
  promptBiometric: vi.fn(),
}));

const storageFns = vi.hoisted(() => ({
  loadVerifier: vi.fn(),
  saveVerifier: vi.fn(),
  loadBiometricKey: vi.fn(),
  saveBiometricKey: vi.fn(),
  clearBiometricKey: vi.fn(),
}));

const dbFns = vi.hoisted(() => ({
  openDatabase: vi.fn(),
  closeDatabase: vi.fn(),
  runMigrations: vi.fn(),
}));

vi.mock('electron', () => ({
  clipboard: { clear: vi.fn() },
  app: { getPath: vi.fn(() => '/tmp/taskflow') },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: vi.fn((value: string) => Buffer.from(value)),
    decryptString: vi.fn((buffer: Buffer) => buffer.toString()),
  },
}));

vi.mock('../../main/services/biometricService', () => ({
  isBiometricAvailable: biometricFns.isBiometricAvailable,
  promptBiometric: biometricFns.promptBiometric,
}));

vi.mock('../../main/services/authStorage', () => ({
  loadVerifier: storageFns.loadVerifier,
  saveVerifier: storageFns.saveVerifier,
  loadBiometricKey: storageFns.loadBiometricKey,
  saveBiometricKey: storageFns.saveBiometricKey,
  clearBiometricKey: storageFns.clearBiometricKey,
}));

vi.mock('../../main/services/dbService', () => ({
  openDatabase: dbFns.openDatabase,
  closeDatabase: dbFns.closeDatabase,
  runMigrations: dbFns.runMigrations,
}));

import {
  unlockWithBiometric,
  enableBiometric,
  lock,
} from '../../main/services/authService';

describe('authService biometric fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lock();
  });

  afterEach(() => {
    lock();
  });

  describe('unlockWithBiometric', () => {
    it('returns false and does not prompt when biometric is unavailable', async () => {
      biometricFns.isBiometricAvailable.mockResolvedValue(false);
      storageFns.loadBiometricKey.mockReturnValue(Buffer.alloc(32));

      const result = await unlockWithBiometric();

      expect(result).toBe(false);
      expect(biometricFns.promptBiometric).not.toHaveBeenCalled();
      expect(dbFns.openDatabase).not.toHaveBeenCalled();
    });

    it('returns false when user cancels the biometric prompt', async () => {
      biometricFns.isBiometricAvailable.mockResolvedValue(true);
      storageFns.loadBiometricKey.mockReturnValue(Buffer.alloc(32));
      biometricFns.promptBiometric.mockResolvedValue(false);

      const result = await unlockWithBiometric();

      expect(result).toBe(false);
      expect(dbFns.openDatabase).not.toHaveBeenCalled();
    });
  });

  describe('enableBiometric', () => {
    it('returns false when biometric hardware is unavailable even with a valid password', async () => {
      biometricFns.isBiometricAvailable.mockResolvedValue(false);

      const password = 'correctpassword';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      storageFns.loadVerifier.mockReturnValue({
        salt: salt.toString('hex'),
        hash: hash.toString('hex'),
      });

      const result = await enableBiometric(password);

      expect(result).toBe(false);
      expect(storageFns.saveBiometricKey).not.toHaveBeenCalled();
    });
  });
});

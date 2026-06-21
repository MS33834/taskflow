import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFns = vi.hoisted(() => ({
  canPromptTouchID: vi.fn(),
  promptTouchID: vi.fn(),
}));

const windowsMockFns = vi.hoisted(() => ({
  checkAvailabilityAsync: vi.fn(),
  requestVerificationAsync: vi.fn(),
}));

vi.mock('electron', () => ({
  systemPreferences: {
    canPromptTouchID: mockFns.canPromptTouchID,
    promptTouchID: mockFns.promptTouchID,
  },
}));

vi.mock('@nodert-win10-rs4/windows.security.credentials.ui', () => ({
  UserConsentVerifier: {
    checkAvailabilityAsync: windowsMockFns.checkAvailabilityAsync,
    requestVerificationAsync: windowsMockFns.requestVerificationAsync,
  },
  UserConsentVerifierAvailability: { available: 0 },
  UserConsentVerificationResult: { verified: 0 },
}));

import {
  isBiometricAvailable,
  promptBiometric,
} from '../../main/services/biometricService';

describe('biometricService', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    mockFns.canPromptTouchID.mockReset();
    mockFns.promptTouchID.mockReset();
    windowsMockFns.checkAvailabilityAsync.mockReset();
    windowsMockFns.requestVerificationAsync.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('macOS Touch ID', () => {
    it('returns false on darwin when Touch ID is unavailable', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockFns.canPromptTouchID.mockReturnValue(false);
      expect(await isBiometricAvailable()).toBe(false);
    });

    it('returns true on darwin when Touch ID is available', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockFns.canPromptTouchID.mockReturnValue(true);
      expect(await isBiometricAvailable()).toBe(true);
    });

    it('promptBiometric returns true when user approves', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockFns.canPromptTouchID.mockReturnValue(true);
      mockFns.promptTouchID.mockResolvedValue(undefined);
      const result = await promptBiometric('unlock');
      expect(result).toBe(true);
      expect(mockFns.promptTouchID).toHaveBeenCalledWith('unlock');
    });

    it('promptBiometric returns false when user cancels', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockFns.canPromptTouchID.mockReturnValue(true);
      mockFns.promptTouchID.mockRejectedValue(new Error('canceled'));
      const result = await promptBiometric('unlock');
      expect(result).toBe(false);
    });
  });

  describe('Windows Hello', () => {
    it('returns true on win32 when Windows Hello is available', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      windowsMockFns.checkAvailabilityAsync.mockImplementation((cb) => cb(null, 0));
      expect(await isBiometricAvailable()).toBe(true);
    });

    it('returns false on win32 when Windows Hello is unavailable', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      windowsMockFns.checkAvailabilityAsync.mockImplementation((cb) => cb(null, 1));
      expect(await isBiometricAvailable()).toBe(false);
    });

    it('returns false on win32 when availability check errors', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      windowsMockFns.checkAvailabilityAsync.mockImplementation((cb) =>
        cb(new Error('not supported'), 0)
      );
      expect(await isBiometricAvailable()).toBe(false);
    });

    it('promptBiometric returns true when user verifies', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      windowsMockFns.requestVerificationAsync.mockImplementation((message, cb) => {
        expect(message).toBe('unlock');
        cb(null, 0);
      });
      const result = await promptBiometric('unlock');
      expect(result).toBe(true);
    });

    it('promptBiometric returns false when user cancels', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      windowsMockFns.requestVerificationAsync.mockImplementation((_, cb) =>
        cb(new Error('canceled'), 0)
      );
      const result = await promptBiometric('unlock');
      expect(result).toBe(false);
    });

    it('promptBiometric returns false when verification result is not verified', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      windowsMockFns.requestVerificationAsync.mockImplementation((_, cb) =>
        cb(null, 1)
      );
      const result = await promptBiometric('unlock');
      expect(result).toBe(false);
    });
  });

  describe('unsupported platforms', () => {
    it('returns false on linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      expect(await isBiometricAvailable()).toBe(false);
    });

    it('promptBiometric returns false on linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const result = await promptBiometric('test');
      expect(result).toBe(false);
      expect(mockFns.promptTouchID).not.toHaveBeenCalled();
      expect(windowsMockFns.requestVerificationAsync).not.toHaveBeenCalled();
    });
  });
});

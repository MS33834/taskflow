import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.doMock('electron', () => ({
  systemPreferences: {},
}));

vi.doMock('@nodert-win10-rs4/windows.security.credentials.ui', () => {
  throw new Error('Cannot find module');
});

describe('biometricService fallback when NodeRT module is missing', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns false on win32 when the Windows Hello native module is not installed', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const { isBiometricAvailable, promptBiometric } = await import(
      '../../main/services/biometricService'
    );

    expect(await isBiometricAvailable()).toBe(false);
    expect(await promptBiometric('unlock')).toBe(false);
  });
});

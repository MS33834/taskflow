import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFns = vi.hoisted(() => ({
  canPromptTouchID: vi.fn(),
  promptTouchID: vi.fn(),
}));

vi.mock('electron', () => ({
  systemPreferences: {
    canPromptTouchID: mockFns.canPromptTouchID,
    promptTouchID: mockFns.promptTouchID,
  },
}));

import { isBiometricAvailable, promptBiometric } from '../../main/services/biometricService';

describe('biometricService', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    mockFns.canPromptTouchID.mockReset();
    mockFns.promptTouchID.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns false on non-darwin platforms', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    expect(isBiometricAvailable()).toBe(false);
  });

  it('returns false on darwin when Touch ID is unavailable', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockFns.canPromptTouchID.mockReturnValue(false);
    expect(isBiometricAvailable()).toBe(false);
  });

  it('returns true on darwin when Touch ID is available', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    mockFns.canPromptTouchID.mockReturnValue(true);
    expect(isBiometricAvailable()).toBe(true);
  });

  it('promptBiometric returns false on non-darwin platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const result = await promptBiometric('test');
    expect(result).toBe(false);
    expect(mockFns.promptTouchID).not.toHaveBeenCalled();
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

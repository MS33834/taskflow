import type { SecuritySettings } from '../../shared/types';
import { getSecuritySettings, saveSecuritySettings } from '../repositories/securitySettingsRepository';

let currentSettings: SecuritySettings = {
  lockMethod: 'password',
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  screenshotProtection: true,
  privacyModeEnabled: false,
};

const VALID_LOCK_METHODS: SecuritySettings['lockMethod'][] = ['password', 'pin', 'biometric'];
const MIN_AUTO_LOCK_MINUTES = 1;
const MAX_AUTO_LOCK_MINUTES = 120;
const MIN_CLIPBOARD_CLEAR_SECONDS = 1;
const MAX_CLIPBOARD_CLEAR_SECONDS = 3600;

/**
 * 校验并清洗来自渲染进程的安全设置，防止非法值导致功能异常或拒绝服务。
 */
export function validateSecuritySettings(input: unknown): SecuritySettings {
  const settings = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  const lockMethod = VALID_LOCK_METHODS.includes(settings.lockMethod as SecuritySettings['lockMethod'])
    ? (settings.lockMethod as SecuritySettings['lockMethod'])
    : 'password';

  const rawAutoLock = Number(settings.autoLockMinutes);
  const autoLockMinutes = Number.isFinite(rawAutoLock)
    ? Math.max(MIN_AUTO_LOCK_MINUTES, Math.min(MAX_AUTO_LOCK_MINUTES, Math.floor(rawAutoLock)))
    : currentSettings.autoLockMinutes;

  const rawClipboard = Number(settings.clipboardClearSeconds);
  const clipboardClearSeconds = Number.isFinite(rawClipboard)
    ? Math.max(MIN_CLIPBOARD_CLEAR_SECONDS, Math.min(MAX_CLIPBOARD_CLEAR_SECONDS, Math.floor(rawClipboard)))
    : currentSettings.clipboardClearSeconds;

  const screenshotProtection = typeof settings.screenshotProtection === 'boolean'
    ? settings.screenshotProtection
    : currentSettings.screenshotProtection;

  const privacyModeEnabled = typeof settings.privacyModeEnabled === 'boolean'
    ? settings.privacyModeEnabled
    : currentSettings.privacyModeEnabled;

  return {
    lockMethod,
    autoLockMinutes,
    clipboardClearSeconds,
    screenshotProtection,
    privacyModeEnabled,
  };
}

export function getCurrentSettings(): SecuritySettings {
  return { ...currentSettings };
}

export function loadSettingsFromDatabase(): SecuritySettings {
  currentSettings = getSecuritySettings();
  return getCurrentSettings();
}

export function updateCurrentSettings(settings: SecuritySettings): SecuritySettings {
  currentSettings = validateSecuritySettings(settings);
  try {
    saveSecuritySettings(currentSettings);
  } catch {
    // Database may not be unlocked yet; keep in-memory only.
  }
  return getCurrentSettings();
}

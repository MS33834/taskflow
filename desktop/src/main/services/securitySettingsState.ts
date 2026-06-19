import type { SecuritySettings } from '../../shared/types';
import { getSecuritySettings, saveSecuritySettings } from '../repositories/securitySettingsRepository';

let currentSettings: SecuritySettings = {
  lockMethod: 'password',
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  screenshotProtection: true,
  privacyModeEnabled: false,
};

export function getCurrentSettings(): SecuritySettings {
  return { ...currentSettings };
}

export function loadSettingsFromDatabase(): SecuritySettings {
  currentSettings = getSecuritySettings();
  return getCurrentSettings();
}

export function updateCurrentSettings(settings: SecuritySettings): SecuritySettings {
  currentSettings = { ...settings };
  try {
    saveSecuritySettings(currentSettings);
  } catch {
    // Database may not be unlocked yet; keep in-memory only.
  }
  return getCurrentSettings();
}

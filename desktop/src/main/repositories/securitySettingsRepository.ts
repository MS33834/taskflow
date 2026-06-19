import { getDatabase } from '../services/dbService';
import type { SecuritySettings } from '../../shared/types';

const DEFAULT_SETTINGS: SecuritySettings = {
  lockMethod: 'password',
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  screenshotProtection: true,
  privacyModeEnabled: false,
};

function rowToSettings(row: Record<string, unknown>): SecuritySettings {
  return {
    lockMethod: (row.lock_method as SecuritySettings['lockMethod']) ?? DEFAULT_SETTINGS.lockMethod,
    autoLockMinutes: (row.auto_lock_minutes as number) ?? DEFAULT_SETTINGS.autoLockMinutes,
    clipboardClearSeconds: (row.clipboard_clear_seconds as number) ?? DEFAULT_SETTINGS.clipboardClearSeconds,
    screenshotProtection: Boolean(row.screenshot_protection),
    privacyModeEnabled: Boolean(row.privacy_mode_enabled),
  };
}

export function getSecuritySettings(): SecuritySettings {
  const row = getDatabase().prepare('SELECT * FROM security_settings WHERE id = 1').get() as
    | Record<string, unknown>
    | undefined;
  return row ? rowToSettings(row) : { ...DEFAULT_SETTINGS };
}

export function initializeSecuritySettings(): void {
  const existing = getDatabase().prepare('SELECT id FROM security_settings WHERE id = 1').get();
  if (!existing) {
    getDatabase()
      .prepare(
        'INSERT INTO security_settings (id, lock_method, auto_lock_minutes, clipboard_clear_seconds, screenshot_protection, privacy_mode_enabled) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        1,
        DEFAULT_SETTINGS.lockMethod,
        DEFAULT_SETTINGS.autoLockMinutes,
        DEFAULT_SETTINGS.clipboardClearSeconds,
        DEFAULT_SETTINGS.screenshotProtection ? 1 : 0,
        DEFAULT_SETTINGS.privacyModeEnabled ? 1 : 0
      );
  }
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  initializeSecuritySettings();
  getDatabase()
    .prepare(
      'UPDATE security_settings SET lock_method = ?, auto_lock_minutes = ?, clipboard_clear_seconds = ?, screenshot_protection = ?, privacy_mode_enabled = ? WHERE id = 1'
    )
    .run(
      settings.lockMethod,
      settings.autoLockMinutes,
      settings.clipboardClearSeconds,
      settings.screenshotProtection ? 1 : 0,
      settings.privacyModeEnabled ? 1 : 0
    );
}

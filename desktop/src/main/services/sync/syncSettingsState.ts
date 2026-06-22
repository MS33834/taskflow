import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';

export interface SyncSettings {
  enabled: boolean;
  relayUrl: string;
  token: string;
}

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  enabled: false,
  relayUrl: '',
  token: '',
};

export function getSyncSettingsPath(): string {
  return path.join(app.getPath('userData'), 'taskflow-sync-settings.dat');
}

export function getSyncSettings(): SyncSettings {
  const filePath = getSyncSettingsPath();
  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_SYNC_SETTINGS };
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available; cannot decrypt sync settings');
  }

  let raw: { encrypted?: boolean; payload?: string };
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    throw new Error(`Corrupt sync settings file: ${filePath}`);
  }

  if (!raw.encrypted || typeof raw.payload !== 'string') {
    throw new Error(`Corrupt sync settings file: ${filePath}`);
  }

  const decrypted = safeStorage.decryptString(Buffer.from(raw.payload, 'base64'));
  const parsed = JSON.parse(decrypted) as Partial<SyncSettings>;
  return {
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SYNC_SETTINGS.enabled,
    relayUrl: typeof parsed.relayUrl === 'string' ? parsed.relayUrl : DEFAULT_SYNC_SETTINGS.relayUrl,
    token: typeof parsed.token === 'string' ? parsed.token : DEFAULT_SYNC_SETTINGS.token,
  };
}

export function setSyncSettings(updates: Partial<SyncSettings>): SyncSettings {
  const current = getSyncSettings();
  const next: SyncSettings = { ...current, ...updates };

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available; refusing to write plaintext sync settings');
  }

  const filePath = getSyncSettingsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const payload = safeStorage.encryptString(JSON.stringify(next)).toString('base64');
  const data = { encrypted: true, payload };
  fs.writeFileSync(filePath, JSON.stringify(data), { mode: 0o600 });
  return next;
}

export function clearSyncSettings(): SyncSettings {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available; refusing to write plaintext sync settings');
  }

  const filePath = getSyncSettingsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const payload = safeStorage.encryptString(JSON.stringify(DEFAULT_SYNC_SETTINGS)).toString('base64');
  const data = { encrypted: true, payload };
  fs.writeFileSync(filePath, JSON.stringify(data), { mode: 0o600 });
  return { ...DEFAULT_SYNC_SETTINGS };
}

export function createTokenStorage(): { get: () => string | undefined; set: (value: string) => void } {
  return {
    get: () => {
      const token = getSyncSettings().token;
      return token || undefined;
    },
    set: (value: string) => {
      setSyncSettings({ token: value });
    },
  };
}

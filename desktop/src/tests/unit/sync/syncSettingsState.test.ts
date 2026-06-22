import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import fs from 'fs';
import path from 'path';
import {
  getSyncSettings,
  setSyncSettings,
  createTokenStorage,
  getSyncSettingsPath,
} from '../../../main/services/sync/syncSettingsState';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plain: string) => Buffer.from(`enc:${plain}`)),
    decryptString: vi.fn((buf: Buffer) => {
      const str = buf.toString();
      if (!str.startsWith('enc:')) throw new Error('bad envelope');
      return str.slice(4);
    }),
  },
}));

describe('syncSettingsState', () => {
  let settingsPath: string;

  beforeEach(() => {
    settingsPath = getSyncSettingsPath();
    if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
  });

  afterEach(() => {
    if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
    vi.clearAllMocks();
  });

  it('returns default settings when file does not exist', () => {
    const settings = getSyncSettings();
    expect(settings).toEqual({ enabled: false, relayUrl: '', token: '' });
  });

  it('saves and loads settings through safeStorage', () => {
    setSyncSettings({ enabled: true, relayUrl: 'http://relay.local:8787', token: 'secret-token' });
    const loaded = getSyncSettings();
    expect(loaded.enabled).toBe(true);
    expect(loaded.relayUrl).toBe('http://relay.local:8787');
    expect(loaded.token).toBe('secret-token');
  });

  it('merges partial updates', () => {
    setSyncSettings({ relayUrl: 'http://relay.local:8787' });
    setSyncSettings({ token: 'token-2' });
    const loaded = getSyncSettings();
    expect(loaded.relayUrl).toBe('http://relay.local:8787');
    expect(loaded.token).toBe('token-2');
    expect(loaded.enabled).toBe(false);
  });

  it('token storage reflects the persisted token', () => {
    setSyncSettings({ token: 'persisted-token' });
    const storage = createTokenStorage();
    expect(storage.get()).toBe('persisted-token');

    storage.set('new-token');
    expect(storage.get()).toBe('new-token');
    expect(getSyncSettings().token).toBe('new-token');
  });
});

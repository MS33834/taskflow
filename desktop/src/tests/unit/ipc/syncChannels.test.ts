import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { registerSyncIpc, notifySyncStateChanged } from '../../../main/ipc/syncChannels';
import { getSyncSettingsPath, setSyncSettings } from '../../../main/services/sync/syncSettingsState';
import { generateDeviceIdentity } from '../../../main/services/sync/syncIdentity';
import { registerSyncDevice } from '../../../main/services/sync/syncStorage';
import { openDatabase, runMigrations, closeDatabase } from '../../../main/services/dbService';
import { IPC_CHANNELS } from '../../../shared/constants';

const handlers: Record<string, (...args: unknown[]) => unknown> = {};
const sentMessages: Record<string, unknown[]> = {};

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers[channel] = handler;
    }),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => [
      {
        webContents: {
          send: vi.fn((channel: string, ...args: unknown[]) => {
            sentMessages[channel] = sentMessages[channel] ?? [];
            sentMessages[channel].push(args);
          }),
        },
      },
    ]),
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

vi.mock('../../../main/services/sync/pairingService', () => ({
  generatePairingCode: vi.fn().mockResolvedValue({ code: '12345678', expiresAt: Date.now() + 300_000 }),
  claimPairingCodeAndPair: vi.fn().mockResolvedValue({ peerDeviceId: 'host-device-id' }),
  respondToPairing: vi.fn().mockReturnValue(Promise.resolve({ peerDeviceId: 'joiner-device-id' })),
}));

describe('syncChannels', () => {
  const dbKey = Buffer.alloc(32, 0xab);
  let dbPath: string;

  beforeEach(async () => {
    const settingsPath = getSyncSettingsPath();
    if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);

    dbPath = path.join(os.tmpdir(), `taskflow-sync-channels-${Date.now()}.db`);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    openDatabase(dbKey, dbPath);
    runMigrations();

    Object.keys(handlers).forEach((key) => delete handlers[key]);
    Object.keys(sentMessages).forEach((key) => delete sentMessages[key]);
    vi.clearAllMocks();

    registerSyncIpc();
  });

  afterEach(() => {
    closeDatabase();
    const settingsPath = getSyncSettingsPath();
    if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('registers all sync handlers', () => {
    expect(handlers[IPC_CHANNELS.SYNC.GET_STATE]).toBeDefined();
    expect(handlers[IPC_CHANNELS.SYNC.SET_ENABLED]).toBeDefined();
    expect(handlers[IPC_CHANNELS.SYNC.SET_RELAY_URL]).toBeDefined();
    expect(handlers[IPC_CHANNELS.SYNC.GENERATE_PAIRING_CODE]).toBeDefined();
    expect(handlers[IPC_CHANNELS.SYNC.CLAIM_PAIRING_CODE]).toBeDefined();
    expect(handlers[IPC_CHANNELS.SYNC.REMOVE_DEVICE]).toBeDefined();
  });

  it('returns default sync state', async () => {
    const state = await handlers[IPC_CHANNELS.SYNC.GET_STATE]();
    expect(state).toEqual({
      enabled: false,
      relayUrl: '',
      devices: [],
      lastSyncAt: null,
    });
  });

  it('enables sync and normalizes relay URL', async () => {
    await handlers[IPC_CHANNELS.SYNC.SET_ENABLED](undefined as never, true);
    await handlers[IPC_CHANNELS.SYNC.SET_RELAY_URL](undefined as never, 'ws://relay.local:8787/');

    const state = await handlers[IPC_CHANNELS.SYNC.GET_STATE]();
    expect(state.enabled).toBe(true);
    expect(state.relayUrl).toBe('http://relay.local:8787/');
    expect(sentMessages[IPC_CHANNELS.SYNC.ON_STATE_CHANGED]).toHaveLength(2);
  });

  it('disabling sync clears settings and devices', async () => {
    await handlers[IPC_CHANNELS.SYNC.SET_ENABLED](undefined as never, true);
    await handlers[IPC_CHANNELS.SYNC.SET_RELAY_URL](undefined as never, 'ws://relay.local:8787/');
    const identity = generateDeviceIdentity('disable-sync-device');
    registerSyncDevice({
      deviceId: identity.deviceId,
      publicKey: identity.publicKeyPem,
      name: 'Test Device',
      pairedAt: 1_000,
    });

    await handlers[IPC_CHANNELS.SYNC.SET_ENABLED](undefined as never, false);

    const state = await handlers[IPC_CHANNELS.SYNC.GET_STATE]();
    expect(state.enabled).toBe(false);
    expect(state.relayUrl).toBe('');
    expect(state.devices).toHaveLength(0);
  });

  it('lists paired devices in state', async () => {
    const identity = generateDeviceIdentity('sync-state-device');
    registerSyncDevice({
      deviceId: identity.deviceId,
      publicKey: identity.publicKeyPem,
      name: 'Test Device',
      pairedAt: 1_000,
    });

    const state = await handlers[IPC_CHANNELS.SYNC.GET_STATE]();
    expect(state.devices).toHaveLength(1);
    expect(state.devices[0].deviceId).toBe(identity.deviceId);
    expect(state.devices[0].name).toBe('Test Device');
  });

  it('generates a pairing code and starts host response', async () => {
    setSyncSettings({ relayUrl: 'http://relay.local:8787' });
    generateDeviceIdentity('host-channel');

    const result = await handlers[IPC_CHANNELS.SYNC.GENERATE_PAIRING_CODE]();

    expect(result.code).toBe('12345678');
  });

  it('claims a pairing code and returns peer device id', async () => {
    setSyncSettings({ relayUrl: 'http://relay.local:8787' });
    generateDeviceIdentity('joiner-channel');

    const result = await handlers[IPC_CHANNELS.SYNC.CLAIM_PAIRING_CODE](undefined as never, '12345678');

    expect(result.success).toBe(true);
    expect(result.deviceId).toBe('host-device-id');
  });

  it('removes a paired device', async () => {
    const identity = generateDeviceIdentity('remove-device');
    registerSyncDevice({
      deviceId: identity.deviceId,
      publicKey: identity.publicKeyPem,
      name: null,
      pairedAt: 1_000,
    });

    await handlers[IPC_CHANNELS.SYNC.REMOVE_DEVICE](undefined as never, identity.deviceId);

    const state = await handlers[IPC_CHANNELS.SYNC.GET_STATE]();
    expect(state.devices).toHaveLength(0);
  });

  it('broadcasts state changes to renderer', () => {
    notifySyncStateChanged();
    expect(sentMessages[IPC_CHANNELS.SYNC.ON_STATE_CHANGED]).toHaveLength(1);
  });
});

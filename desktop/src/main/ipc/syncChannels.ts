import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { SyncState } from '../../shared/types';
import {
  getSyncSettings,
  setSyncSettings,
  createTokenStorage,
} from '../services/sync/syncSettingsState';
import { listSyncDevices, removeSyncDevice, getSyncState } from '../services/sync/syncStorage';
import { loadDeviceIdentity, generateDeviceIdentity } from '../services/sync/syncIdentity';
import {
  generatePairingCode,
  claimPairingCodeAndPair,
  respondToPairing,
} from '../services/sync/pairingService';

export function registerSyncIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SYNC.GET_STATE, async () => buildSyncState());

  ipcMain.handle(IPC_CHANNELS.SYNC.SET_ENABLED, async (_event, enabled: boolean) => {
    setSyncSettings({ enabled });
    notifySyncStateChanged();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.SYNC.SET_RELAY_URL, async (_event, url: string) => {
    const relayUrl = normalizeRelayUrl(url);
    setSyncSettings({ relayUrl });
    notifySyncStateChanged();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.SYNC.GENERATE_PAIRING_CODE, async () => {
    const settings = getSyncSettings();
    if (!settings.relayUrl) {
      throw new Error('relay URL not configured');
    }
    const identity = loadDeviceIdentity() ?? generateDeviceIdentity('TaskFlow Desktop');
    const tokenStorage = createTokenStorage();
    const result = await generatePairingCode(settings.relayUrl, identity, tokenStorage);
    const wsUrl = relayHttpUrlToWsUrl(settings.relayUrl);
    respondToPairing(wsUrl, tokenStorage.get() ?? '', result.code, identity).then(
      () => notifySyncStateChanged(),
      (err) => console.error('[sync] host pairing failed', err)
    );
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.SYNC.CLAIM_PAIRING_CODE, async (_event, code: string) => {
    const settings = getSyncSettings();
    if (!settings.relayUrl) {
      throw new Error('relay URL not configured');
    }
    const identity = loadDeviceIdentity() ?? generateDeviceIdentity('TaskFlow Desktop');
    try {
      const result = await claimPairingCodeAndPair(
        settings.relayUrl,
        identity,
        code,
        createTokenStorage()
      );
      notifySyncStateChanged();
      return { success: true, deviceId: result.peerDeviceId };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYNC.REMOVE_DEVICE, async (_event, deviceId: string) => {
    removeSyncDevice(deviceId);
    notifySyncStateChanged();
    return true;
  });
}

export function notifySyncStateChanged(): void {
  const state = buildSyncState();
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.SYNC.ON_STATE_CHANGED, state);
  }
}

function buildSyncState(): SyncState {
  const settings = getSyncSettings();
  const devices = listSyncDevices();
  const syncState = getSyncState();
  return {
    enabled: settings.enabled,
    relayUrl: settings.relayUrl,
    devices,
    lastSyncAt: syncState.lastSyncAt,
  };
}

function normalizeRelayUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('ws://')) {
    return trimmed.replace(/^ws/, 'http');
  }
  if (trimmed.startsWith('wss://')) {
    return trimmed.replace(/^wss/, 'https');
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('relay URL must include a protocol');
  }
  return trimmed;
}

function relayHttpUrlToWsUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  if (url.pathname === '/') {
    url.pathname = '/sync';
  }
  return url.toString();
}

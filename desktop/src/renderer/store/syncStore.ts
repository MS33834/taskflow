import { create } from 'zustand';
import type { SyncState, SyncDeviceInfo } from '../../shared/types';

interface PairingCodeInfo {
  code: string;
  expiresAt: number;
}

interface SyncStoreState extends SyncState {
  isLoading: boolean;
  pairingCode: PairingCodeInfo | null;
  dialogMode: 'none' | 'host' | 'join';
  error: string | null;
  fetch: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setRelayUrl: (url: string) => Promise<void>;
  generatePairingCode: () => Promise<void>;
  claimPairingCode: (code: string) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  setDialogMode: (mode: 'none' | 'host' | 'join') => void;
  clearError: () => void;
  setStateFromPush: (state: SyncState) => void;
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  enabled: false,
  relayUrl: '',
  devices: [],
  lastSyncAt: null,
  isLoading: true,
  pairingCode: null,
  dialogMode: 'none',
  error: null,

  fetch: async () => {
    const state = await window.taskflowAPI.sync.getState();
    set({ ...state, isLoading: false });
  },

  setEnabled: async (enabled) => {
    await window.taskflowAPI.sync.setEnabled(enabled);
    set({ enabled });
    await get().fetch();
  },

  setRelayUrl: async (url) => {
    await window.taskflowAPI.sync.setRelayUrl(url);
    set({ relayUrl: url });
    await get().fetch();
  },

  generatePairingCode: async () => {
    try {
      set({ error: null });
      const result = await window.taskflowAPI.sync.generatePairingCode();
      set({ pairingCode: result, dialogMode: 'host' });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  claimPairingCode: async (code) => {
    try {
      set({ error: null });
      const result = await window.taskflowAPI.sync.claimPairingCode(code);
      if (result.success) {
        set({ dialogMode: 'none' });
        await get().fetch();
      } else {
        set({ error: result.message ?? '配对失败' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  removeDevice: async (deviceId) => {
    await window.taskflowAPI.sync.removeDevice(deviceId);
    await get().fetch();
  },

  setDialogMode: (mode) => {
    set({ dialogMode: mode, error: null, pairingCode: mode === 'none' ? null : get().pairingCode });
  },

  clearError: () => {
    set({ error: null });
  },

  setStateFromPush: (state) => {
    set({ ...state, isLoading: false });
  },
}));

export function formatLastSeen(timestamp: number | null): string {
  if (!timestamp) return '从未';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `今天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export type { SyncDeviceInfo };

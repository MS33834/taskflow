// Sync Slice — 同步与备份配置状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { SyncConfig } from '../../types';
import { isApiAvailable } from '../../api';

export interface SyncSlice {
  syncConfig: SyncConfig;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  apiAvailable: boolean;
  setSyncConfig: (config: SyncConfig) => void;
  performSync: () => Promise<void>;
  setLastSyncAt: (date: Date) => void;
  checkApiAvailability: () => Promise<void>;
}

export const createSyncSlice: StateCreator<AppStore, [], [], SyncSlice> = (set, get) => ({
  syncConfig: {
    enabled: false,
    provider: 'expo',
    syncInterval: 15,
    lastSyncAt: null,
    syncStatus: 'idle',
    conflictStrategy: 'merge',
    autoSync: false,
    syncOnStart: false,
    syncOnEdit: false,
    wifiOnly: false,
    credentials: null,
  },
  lastSyncAt: null,
  isSyncing: false,
  apiAvailable: false,

  setSyncConfig: (config) => {
    set({ syncConfig: config });
    get().saveData();
  },

  performSync: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      // Simulate sync - actual implementation would connect to cloud provider
      await new Promise((resolve) => setTimeout(resolve, 2000));
      set({ lastSyncAt: new Date(), isSyncing: false });
      get().saveData();
    } catch (error) {
      set({ isSyncing: false });
      throw error;
    }
  },

  setLastSyncAt: (date) => set({ lastSyncAt: date }),

  checkApiAvailability: async () => {
    const available = await isApiAvailable();
    set({ apiAvailable: available });
  },
});

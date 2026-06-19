import { create } from 'zustand';
import type { VaultItem } from '../../shared/types';

interface VaultState {
  items: VaultItem[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  update: (id: string, updates: Partial<VaultItem>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  generatePassword: (length: number) => Promise<string>;
}

export const useVaultStore = create<VaultState>((set) => ({
  items: [],
  loading: false,
  fetch: async () => {
    set({ loading: true });
    const items = await window.taskflowAPI.vault.list();
    set({ items, loading: false });
  },
  create: async (item) => {
    await window.taskflowAPI.vault.create(item);
    await useVaultStore.getState().fetch();
  },
  update: async (id, updates) => {
    await window.taskflowAPI.vault.update(id, updates);
    await useVaultStore.getState().fetch();
  },
  delete: async (id) => {
    await window.taskflowAPI.vault.delete(id);
    await useVaultStore.getState().fetch();
  },
  generatePassword: async (length) => {
    return window.taskflowAPI.vault.generatePassword(length);
  },
}));

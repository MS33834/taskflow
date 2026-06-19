import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type { Task, VaultItem, SecuritySettings } from '../shared/types';

const api = {
  auth: {
    unlock: (password: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH.UNLOCK, password),
    lock: () => ipcRenderer.send(IPC_CHANNELS.AUTH.LOCK),
    isUnlocked: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.IS_UNLOCKED),
  },
  tasks: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.TASKS.LIST),
    create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASKS.CREATE, task),
    update: (id: string, updates: Partial<Task>) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASKS.UPDATE, id, updates),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.DELETE, id),
  },
  vault: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT.LIST),
    create: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT.CREATE, item),
    update: (id: string, updates: Partial<VaultItem>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT.UPDATE, id, updates),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VAULT.DELETE, id),
    generatePassword: (length: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT.GENERATE_PASSWORD, length),
  },
  security: {
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY.GET_SETTINGS),
    setSettings: (settings: SecuritySettings) =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY.SET_SETTINGS, settings),
    clearClipboard: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY.CLEAR_CLIPBOARD),
  },
};

contextBridge.exposeInMainWorld('taskflowAPI', api);

export type TaskflowAPI = typeof api;

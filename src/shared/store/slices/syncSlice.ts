// Sync Slice — 同步与备份配置状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { SyncConfig } from '../../types';
import { isApiAvailable } from '../../api';
import {
  fetchTasks,
  fetchProjects,
  fetchCategories,
  fetchTags,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
} from '../../api';

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
      const available = await isApiAvailable();
      if (!available) {
        set({ isSyncing: false, apiAvailable: false });
        return;
      }
      set({ apiAvailable: true });

      // 拉取远端数据
      const [remoteTasks, remoteProjects, remoteCategories, remoteTags] = await Promise.all([
        fetchTasks().catch(() => []),
        fetchProjects().catch(() => []),
        fetchCategories().catch(() => []),
        fetchTags().catch(() => []),
      ]);

      const localTasks = get().tasks;
      const conflictStrategy = get().syncConfig.conflictStrategy;

      // 合并任务：以 updatedAt 为准，last-write-wins
      const taskMap = new Map<string, typeof localTasks[number]>();
      for (const t of localTasks) taskMap.set(t.id, t);
      for (const remote of remoteTasks) {
        const local = taskMap.get(remote.id);
        if (!local) {
          // 远端新增，拉取到本地
          taskMap.set(remote.id, remote);
        } else {
          const localUpdated = new Date(local.updatedAt).getTime();
          const remoteUpdated = new Date(remote.updatedAt).getTime();
          if (conflictStrategy === 'remote') {
            taskMap.set(remote.id, remote);
          } else if (conflictStrategy === 'local') {
            // 保留本地
          } else {
            // merge：以较新的为准
            if (remoteUpdated > localUpdated) taskMap.set(remote.id, remote);
          }
        }
      }

      // 推送本地独有的新任务到远端
      const remoteTaskIds = new Set(remoteTasks.map((t) => t.id));
      const pushPromises: Promise<unknown>[] = [];
      for (const local of localTasks) {
        if (!remoteTaskIds.has(local.id)) {
          pushPromises.push(
            apiCreateTask(local).catch((e) => console.warn('Sync: push task failed:', e)),
          );
        } else {
          // 推送本地更新的任务
          const remote = remoteTasks.find((r) => r.id === local.id);
          if (remote && new Date(local.updatedAt) > new Date(remote.updatedAt)) {
            pushPromises.push(
              apiUpdateTask(local.id, local).catch((e) => console.warn('Sync: update task failed:', e)),
            );
          }
        }
      }

      // 更新本地状态
      set({
        tasks: Array.from(taskMap.values()),
        projects: remoteProjects.length > 0 ? remoteProjects : get().projects,
        categories: remoteCategories.length > 0 ? remoteCategories : get().categories,
        tags: remoteTags.length > 0 ? remoteTags : get().tags,
      });

      // 等待推送完成（不阻塞错误）
      await Promise.allSettled(pushPromises);

      set({ lastSyncAt: new Date(), isSyncing: false });
      get().saveData();
    } catch (error) {
      set({ isSyncing: false });
      console.error('Sync failed:', error);
      throw error;
    }
  },

  setLastSyncAt: (date) => set({ lastSyncAt: date }),

  checkApiAvailability: async () => {
    const available = await isApiAvailable();
    set({ apiAvailable: available });
  },
});

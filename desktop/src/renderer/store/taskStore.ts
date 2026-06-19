import { create } from 'zustand';
import type { Task } from '../../shared/types';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  update: (id: string, updates: Partial<Task>) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  fetch: async () => {
    set({ loading: true });
    const tasks = await window.taskflowAPI.tasks.list();
    set({ tasks, loading: false });
  },
  create: async (task) => {
    await window.taskflowAPI.tasks.create(task);
    await useTaskStore.getState().fetch();
  },
  update: async (id, updates) => {
    await window.taskflowAPI.tasks.update(id, updates);
    await useTaskStore.getState().fetch();
  },
  delete: async (id) => {
    await window.taskflowAPI.tasks.delete(id);
    await useTaskStore.getState().fetch();
  },
}));

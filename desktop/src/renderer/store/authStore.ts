import { create } from 'zustand';

interface AuthState {
  isUnlocked: boolean;
  isLoading: boolean;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  checkStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  isLoading: true,
  unlock: async (password) => {
    const success = await window.taskflowAPI.auth.unlock(password);
    set({ isUnlocked: success });
    return success;
  },
  lock: () => {
    window.taskflowAPI.auth.lock();
    set({ isUnlocked: false });
  },
  checkStatus: async () => {
    const unlocked = await window.taskflowAPI.auth.isUnlocked();
    set({ isUnlocked: unlocked, isLoading: false });
  },
}));

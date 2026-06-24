// Auth Slice — 用户认证状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { User } from '../../types';
import { clearStoredAuth, setStoredAuth } from '../../utils/secureStorage';

export interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,

  login: (user, token) => {
    set({ user, isAuthenticated: true });
    // 优先使用 expo-secure-store（iOS Keychain / Android Keystore）保存 token；
    // 未安装时内部回退到 AsyncStorage，并在加载时通过同一封装读取。
    setStoredAuth(user, token).catch((error) => {
      console.warn('Failed to persist auth securely:', error);
    });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    clearStoredAuth().catch((error) => {
      console.warn('Failed to clear stored auth:', error);
    });
  },
});

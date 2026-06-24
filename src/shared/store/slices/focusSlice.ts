// Focus Slice — 番茄钟专注会话状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { FocusSession } from '../../types';

export interface FocusSlice {
  sessions: FocusSession[];
  addSession: (session: Omit<FocusSession, 'id'>) => void;
  clearSessions: () => void;
}

export const createFocusSlice: StateCreator<AppStore, [], [], FocusSlice> = (set, get) => ({
  sessions: [],

  addSession: (session) => {
    const newSession = {
      ...session,
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    set(state => ({
      sessions: [newSession, ...(state.sessions || [])].slice(0, 100),
    }));
    get().saveData();
  },

  clearSessions: () => {
    set({ sessions: [] });
    get().saveData();
  },
});

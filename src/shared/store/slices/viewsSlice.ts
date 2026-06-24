// Views Slice — 视图管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { View } from '../../types';
import { generateId, defaultViews } from '../constants';

export interface ViewsSlice {
  views: View[];
  activeView: View | null;
  addView: (view: Omit<View, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateView: (id: string, updates: Partial<View>) => void;
  deleteView: (id: string) => void;
  setActiveView: (view: View | null) => void;
  setDefaultViews: () => void;
}

export const createViewsSlice: StateCreator<AppStore, [], [], ViewsSlice> = (set, get) => ({
  views: defaultViews,
  activeView: defaultViews[0],

  addView: (view) => {
    const id = generateId();
    const newView: View = {
      ...view,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ views: [...state.views, newView] }));
    get().saveData();
    return id;
  },

  updateView: (id, updates) => {
    set((state) => ({
      views: state.views.map((view) =>
        view.id === id ? { ...view, ...updates, updatedAt: new Date() } : view
      ),
    }));
    get().saveData();
  },

  deleteView: (id) => {
    set((state) => ({
      views: state.views.filter((view) => view.id !== id),
      activeView: state.activeView?.id === id ? null : state.activeView,
    }));
    get().saveData();
  },

  setActiveView: (view) => set({ activeView: view }),

  setDefaultViews: () => {
    set({ views: defaultViews, activeView: defaultViews[0] });
  },
});

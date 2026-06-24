// Store 入口文件 — 组合所有 slice
// 使用 Zustand slice 模式，将单一 store 拆分为多个 slice 文件
// 所有现有代码通过 useAppStore(s => s.xxx) 或 const { xxx } = useAppStore() 访问 store 的方式保持不变

import { create } from 'zustand';
import type { AppStore } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createTasksSlice } from './slices/tasksSlice';
import { createProjectsSlice } from './slices/projectsSlice';
import { createCategoriesSlice } from './slices/categoriesSlice';
import { createTagsSlice } from './slices/tagsSlice';
import { createViewsSlice } from './slices/viewsSlice';
import { createCalendarSlice } from './slices/calendarSlice';
import { createRemindersSlice } from './slices/remindersSlice';
import { createGoalsSlice } from './slices/goalsSlice';
import { createHabitsSlice } from './slices/habitsSlice';
import { createNotesSlice } from './slices/notesSlice';
import { createAISlice } from './slices/aiSlice';
import { createAnalyticsSlice } from './slices/analyticsSlice';
import { createUISlice } from './slices/uiSlice';
import { createPreferencesSlice } from './slices/preferencesSlice';
import { createAutomationSlice } from './slices/automationSlice';
import { createTemplatesSlice } from './slices/templatesSlice';
import { createTeamsSlice } from './slices/teamsSlice';
import { createSyncSlice } from './slices/syncSlice';
import { createFocusSlice } from './slices/focusSlice';
import { createSearchSlice } from './slices/searchSlice';
import { createPersistenceSlice } from './slices/persistenceSlice';

export const useAppStore = create<AppStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createTasksSlice(...a),
  ...createProjectsSlice(...a),
  ...createCategoriesSlice(...a),
  ...createTagsSlice(...a),
  ...createViewsSlice(...a),
  ...createCalendarSlice(...a),
  ...createRemindersSlice(...a),
  ...createGoalsSlice(...a),
  ...createHabitsSlice(...a),
  ...createNotesSlice(...a),
  ...createAISlice(...a),
  ...createAnalyticsSlice(...a),
  ...createUISlice(...a),
  ...createPreferencesSlice(...a),
  ...createAutomationSlice(...a),
  ...createTemplatesSlice(...a),
  ...createTeamsSlice(...a),
  ...createSyncSlice(...a),
  ...createFocusSlice(...a),
  ...createSearchSlice(...a),
  ...createPersistenceSlice(...a),
}));

// AppStore 类型定义：组合所有 slice 接口
// 使用 import type 避免运行时循环依赖

import type { AuthSlice } from './slices/authSlice';
import type { TasksSlice } from './slices/tasksSlice';
import type { ProjectsSlice } from './slices/projectsSlice';
import type { CategoriesSlice } from './slices/categoriesSlice';
import type { TagsSlice } from './slices/tagsSlice';
import type { ViewsSlice } from './slices/viewsSlice';
import type { CalendarSlice } from './slices/calendarSlice';
import type { RemindersSlice } from './slices/remindersSlice';
import type { GoalsSlice } from './slices/goalsSlice';
import type { HabitsSlice } from './slices/habitsSlice';
import type { NotesSlice } from './slices/notesSlice';
import type { AISlice } from './slices/aiSlice';
import type { AnalyticsSlice } from './slices/analyticsSlice';
import type { UISlice } from './slices/uiSlice';
import type { PreferencesSlice } from './slices/preferencesSlice';
import type { AutomationSlice } from './slices/automationSlice';
import type { TemplatesSlice } from './slices/templatesSlice';
import type { TeamsSlice } from './slices/teamsSlice';
import type { SyncSlice } from './slices/syncSlice';
import type { FocusSlice } from './slices/focusSlice';
import type { SearchSlice } from './slices/searchSlice';
import type { PersistenceSlice } from './slices/persistenceSlice';

// AppStore 通过 extends 所有 slice 接口组合而成
export interface AppStore extends
  AuthSlice,
  TasksSlice,
  ProjectsSlice,
  CategoriesSlice,
  TagsSlice,
  ViewsSlice,
  CalendarSlice,
  RemindersSlice,
  GoalsSlice,
  HabitsSlice,
  NotesSlice,
  AISlice,
  AnalyticsSlice,
  UISlice,
  PreferencesSlice,
  AutomationSlice,
  TemplatesSlice,
  TeamsSlice,
  SyncSlice,
  FocusSlice,
  SearchSlice,
  PersistenceSlice {}

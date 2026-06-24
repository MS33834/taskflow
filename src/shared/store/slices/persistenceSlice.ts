// Persistence Slice — 数据持久化（加载、保存、导出、导入、重置）
// 通过 get() 访问所有 slice 的状态，实现全局持久化
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import {
  fetchTasks,
  fetchProjects,
  fetchCategories,
  fetchTags,
} from '../../api';
import { STORAGE_KEYS, initialCategories, initialTags, defaultViews } from '../constants';

export interface PersistenceSlice {
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  resetData: () => void;
}

export const createPersistenceSlice: StateCreator<AppStore, [], [], PersistenceSlice> = (set, get) => ({
  loadData: async () => {
    try {
      await get().checkApiAvailability();

      if (get().apiAvailable) {
        try {
          const [tasks, projects, categories, tags] = await Promise.all([
            fetchTasks(),
            fetchProjects(),
            fetchCategories(),
            fetchTags(),
          ]);
          set({ tasks, projects, categories, tags });
          return;
        } catch (error) {
          console.warn('API load failed, falling back to local storage:', error);
          set({ apiAvailable: false });
        }
      }

      const [
        tasksData, projectsData, categoriesData, tagsData, viewsData,
        themeData, goalsData, habitsData, notesData, calendarsData,
        eventsData, remindersData, automationData, templatesData, teamsData,
        sessionsData,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TASKS),
        AsyncStorage.getItem(STORAGE_KEYS.PROJECTS),
        AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES),
        AsyncStorage.getItem(STORAGE_KEYS.TAGS),
        AsyncStorage.getItem(STORAGE_KEYS.VIEWS),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.HABITS),
        AsyncStorage.getItem(STORAGE_KEYS.NOTES),
        AsyncStorage.getItem(STORAGE_KEYS.CALENDARS),
        AsyncStorage.getItem(STORAGE_KEYS.EVENTS),
        AsyncStorage.getItem(STORAGE_KEYS.REMINDERS),
        AsyncStorage.getItem(STORAGE_KEYS.AUTOMATION),
        AsyncStorage.getItem(STORAGE_KEYS.TEMPLATES),
        AsyncStorage.getItem(STORAGE_KEYS.TEAMS),
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
      ]);

      const parseDates = (data: Record<string, unknown>) => ({
        ...data,
        createdAt: data.createdAt ? new Date(data.createdAt as string | number | Date) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt as string | number | Date) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate as string | number | Date) : null,
        completedAt: data.completedAt ? new Date(data.completedAt as string | number | Date) : null,
        startDate: data.startDate ? new Date(data.startDate as string | number | Date) : null,
        endDate: data.endDate ? new Date(data.endDate as string | number | Date) : null,
      });

      if (tasksData) {
        const tasks = JSON.parse(tasksData).map(parseDates);
        set({ tasks });
      }
      if (projectsData) {
        const projects = JSON.parse(projectsData).map(parseDates);
        set({ projects });
      }
      if (categoriesData) {
        const categories = JSON.parse(categoriesData).map(parseDates);
        if (categories.length > 0) set({ categories });
      }
      if (tagsData) {
        const tags = JSON.parse(tagsData).map(parseDates);
        if (tags.length > 0) set({ tags });
      }
      if (viewsData) {
        const views = JSON.parse(viewsData).map(parseDates);
        if (views.length > 0) {
          set({ views, activeView: views[0] });
        }
      }
      if (themeData) {
        const theme = JSON.parse(themeData);
        set({ theme });
      }
      if (goalsData) {
        const goals = JSON.parse(goalsData).map(parseDates);
        if (goals.length > 0) set({ goals });
      }
      if (habitsData) {
        const habits = JSON.parse(habitsData).map(parseDates);
        if (habits.length > 0) set({ habits });
      }
      if (notesData) {
        const notes = JSON.parse(notesData).map(parseDates);
        if (notes.length > 0) set({ notes });
      }
      if (calendarsData) {
        const calendars = JSON.parse(calendarsData).map(parseDates);
        if (calendars.length > 0) set({ calendars });
      }
      if (eventsData) {
        const events = JSON.parse(eventsData).map(parseDates);
        if (events.length > 0) set({ events });
      }
      if (remindersData) {
        const reminders = JSON.parse(remindersData).map(parseDates);
        if (reminders.length > 0) set({ reminders });
      }
      if (automationData) {
        const automationRules = JSON.parse(automationData).map(parseDates);
        if (automationRules.length > 0) set({ automationRules });
      }
      if (templatesData) {
        const templates = JSON.parse(templatesData).map(parseDates);
        if (templates.length > 0) set({ templates });
      }
      if (teamsData) {
        const teams = JSON.parse(teamsData).map(parseDates);
        if (teams.length > 0) set({ teams });
      }
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData).map((s: Record<string, unknown>) => ({
          ...s,
          startedAt: s.startedAt ? new Date(s.startedAt as string | number | Date) : new Date(),
        }));
        if (sessions.length > 0) set({ sessions });
      }

      const userPrefsData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (userPrefsData) {
        set({ userPreferences: JSON.parse(userPrefsData) });
      }

      const sidebarData = await AsyncStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
      if (sidebarData) {
        set({ sidebarOpen: JSON.parse(sidebarData) });
      }

      const searchHistoryData = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      if (searchHistoryData) {
        set({ searchHistory: JSON.parse(searchHistoryData) });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  },

  saveData: async () => {
    try {
      const state = get();
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks)),
        AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(state.projects)),
        AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(state.categories)),
        AsyncStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(state.tags)),
        AsyncStorage.setItem(STORAGE_KEYS.VIEWS, JSON.stringify(state.views)),
        AsyncStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(state.theme)),
        AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(state.goals)),
        AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(state.habits)),
        AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(state.notes)),
        AsyncStorage.setItem(STORAGE_KEYS.CALENDARS, JSON.stringify(state.calendars)),
        AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(state.events)),
        AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(state.reminders)),
        AsyncStorage.setItem(STORAGE_KEYS.AUTOMATION, JSON.stringify(state.automationRules)),
        AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(state.templates)),
        AsyncStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(state.teams)),
        AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions || [])),
        AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(state.userPreferences)),
        AsyncStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, JSON.stringify(state.sidebarOpen)),
        AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(state.searchHistory)),
        AsyncStorage.setItem(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(state.syncConfig)),
      ]);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  },

  exportData: async () => {
    const state = get();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tasks: state.tasks,
      projects: state.projects,
      categories: state.categories,
      tags: state.tags,
      views: state.views,
      goals: state.goals,
      habits: state.habits,
      notes: state.notes,
      settings: {
        theme: state.theme,
        syncConfig: state.syncConfig,
      },
    };
    return JSON.stringify(exportData, null, 2);
  },

  importData: async (data: string) => {
    try {
      const parsed = JSON.parse(data);

      // 基础校验：导入数据必须是对象，且关键字段为数组，防止原型污染或异常输入导致状态崩溃。
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('导入数据必须是对象');
      }

      const MAX_IMPORT_ITEMS = 10000;
      const assertArray = (value: unknown, name: string): boolean => {
        if (value === undefined) return true;
        if (!Array.isArray(value)) {
          throw new Error(`导入数据字段 ${name} 必须是数组`);
        }
        if (value.length > MAX_IMPORT_ITEMS) {
          throw new Error(`导入数据字段 ${name} 超过最大允许数量 ${MAX_IMPORT_ITEMS}`);
        }
        return true;
      };

      assertArray(parsed.tasks, 'tasks');
      assertArray(parsed.projects, 'projects');
      assertArray(parsed.categories, 'categories');
      assertArray(parsed.tags, 'tags');
      assertArray(parsed.views, 'views');
      assertArray(parsed.goals, 'goals');
      assertArray(parsed.habits, 'habits');
      assertArray(parsed.notes, 'notes');

      // 校验通过后恢复原有的 any 行为，避免破坏已有的宽松类型推断。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const importData = parsed as Record<string, any>;

      if (importData.tasks) {
        set({ tasks: importData.tasks.map((t: Record<string, unknown>) => ({
          ...t,
          createdAt: new Date(t.createdAt as string | number | Date),
          updatedAt: new Date(t.updatedAt as string | number | Date),
        })) });
      }
      if (importData.projects) {
        set({ projects: importData.projects.map((p: Record<string, unknown>) => ({
          ...p,
          createdAt: new Date(p.createdAt as string | number | Date),
          updatedAt: new Date(p.updatedAt as string | number | Date),
        })) });
      }
      if (importData.categories) {
        set({ categories: importData.categories.map((c: Record<string, unknown>) => ({
          ...c,
          createdAt: new Date(c.createdAt as string | number | Date),
          updatedAt: new Date(c.updatedAt as string | number | Date),
        })) });
      }
      if (importData.tags) {
        set({ tags: importData.tags.map((t: Record<string, unknown>) => ({
          ...t,
          createdAt: new Date(t.createdAt as string | number | Date),
          updatedAt: new Date(t.updatedAt as string | number | Date),
        })) });
      }
      if (importData.views) {
        set({ views: importData.views.map((v: Record<string, unknown>) => ({
          ...v,
          createdAt: new Date(v.createdAt as string | number | Date),
          updatedAt: new Date(v.updatedAt as string | number | Date),
        })) });
      }
      if (importData.goals) {
        set({ goals: importData.goals.map((g: Record<string, unknown>) => ({
          ...g,
          startDate: g.startDate ? new Date(g.startDate as string | number | Date) : new Date(),
          endDate: g.endDate ? new Date(g.endDate as string | number | Date) : new Date(),
          completedAt: g.completedAt ? new Date(g.completedAt as string | number | Date) : null,
          createdAt: g.createdAt ? new Date(g.createdAt as string | number | Date) : new Date(),
          updatedAt: g.updatedAt ? new Date(g.updatedAt as string | number | Date) : new Date(),
        })) });
      }
      if (importData.habits) {
        set({ habits: importData.habits.map((h: Record<string, unknown>) => ({
          ...h,
          createdAt: h.createdAt ? new Date(h.createdAt as string | number | Date) : new Date(),
          updatedAt: h.updatedAt ? new Date(h.updatedAt as string | number | Date) : new Date(),
        })) });
      }
      if (importData.notes) {
        set({ notes: importData.notes.map((n: Record<string, unknown>) => ({
          ...n,
          createdAt: n.createdAt ? new Date(n.createdAt as string | number | Date) : new Date(),
          updatedAt: n.updatedAt ? new Date(n.updatedAt as string | number | Date) : new Date(),
        })) });
      }
      if (importData.settings?.theme) set({ theme: importData.settings.theme });

      get().saveData();
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  },

  resetData: () => {
    set({
      tasks: [],
      projects: [],
      categories: initialCategories,
      tags: initialTags,
      views: defaultViews,
      activeView: defaultViews[0],
      goals: [],
      habits: [],
      notes: [],
      teams: [],
      activities: [],
      automationRules: [],
      templates: [],
      dashboardStats: null,
      selectedTask: null,
      selectedProject: null,
      selectedGoal: null,
      selectedHabit: null,
      selectedNote: null,
      currentTeam: null,
      searchHistory: [],
    });
    get().saveData();
  },
});

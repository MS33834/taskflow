// Analytics Slice — 数据分析与仪表盘统计状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { DashboardStats, TaskStats } from '../../types';

export interface AnalyticsSlice {
  dashboardStats: DashboardStats | null;
  calculateDashboardStats: () => void;
  getTaskStats: (taskIds: string[]) => TaskStats;
  getProductivityScore: () => number;
  getCompletionRate: () => number;
  getStreak: () => number;
}

export const createAnalyticsSlice: StateCreator<AppStore, [], [], AnalyticsSlice> = (set, get) => ({
  dashboardStats: null,

  calculateDashboardStats: () => {
    const tasks = get().tasks;
    const goals = get().goals;
    const habits = get().habits;
    const projects = get().projects;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeTasks = tasks.filter((t) => !t.isArchived && !t.isDeleted);
    // 单次遍历统计各维度计数，避免 6 次 filter 的 O(6n) 重复扫描。
    let completedCount = 0;
    let inProgressCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let todayCount = 0;
    for (const t of activeTasks) {
      if (t.completed) completedCount++;
      if (t.status === 'in-progress') inProgressCount++;
      if (t.dueDate) {
        const dueDate = new Date(t.dueDate);
        const isToday = dueDate >= today && dueDate < tomorrow;
        if (isToday) todayCount++;
        if (!t.completed) {
          if (dueDate < today) overdueCount++;
          if (dueDate >= today && dueDate <= tomorrow) upcomingCount++;
        }
      }
    }

    const stats: DashboardStats = {
      overview: {
        totalTasks: activeTasks.length,
        completedTasks: completedCount,
        inProgressTasks: inProgressCount,
        overdueTasks: overdueCount,
        upcomingTasks: upcomingCount,
        todayTasks: todayCount,
        completionRate: activeTasks.length > 0 ? (completedCount / activeTasks.length) * 100 : 0,
        averageCompletionTime: 0,
        streak: 0,
        bestStreak: 0,
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === 'active').length,
        totalHabits: habits.length,
        habitsCompletedToday: habits.filter((h) => h.completionHistory[today.toISOString().split('T')[0]]).length,
      },
      productivity: {
        daily: [],
        weekly: [],
        monthly: [],
        yearly: [],
        bestDay: { day: 0, score: 0 },
        bestWeek: { week: 0, score: 0 },
        productivityScore: 0,
        focusScore: 0,
        consistencyScore: 0,
      },
      trends: [],
      categories: [],
      timeUsage: {
        byDay: {},
        byHour: {},
        byCategory: {},
        byProject: {},
        byPriority: {},
      },
      goals: goals.map((g) => ({
        id: g.id,
        name: g.title,
        type: g.type,
        target: g.targetValue,
        current: g.currentValue,
        period: 'daily' as const,
        startDate: g.startDate,
        endDate: g.endDate,
        isCompleted: g.isCompleted,
        progress: g.progress,
        daysRemaining: Math.ceil((new Date(g.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      habits: habits.map((h) => ({
        id: h.id,
        name: h.name,
        currentStreak: h.streak,
        bestStreak: h.bestStreak,
        completionRate: 0,
        totalCompletions: h.totalCompletions,
        averageDuration: h.averageDuration,
      })),
    };

    set({ dashboardStats: stats });
  },

  getTaskStats: (taskIds) => {
    const tasks = get().tasks.filter((t) => taskIds.includes(t.id));
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      overdue: tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length,
    };
  },

  getProductivityScore: () => {
    const tasks = get().tasks.filter((t) => !t.isArchived && !t.isDeleted);
    const completed = tasks.filter((t) => t.completed);
    const onTime = completed.filter((t) => {
      if (!t.completedAt || !t.dueDate) return false;
      return new Date(t.completedAt) <= new Date(t.dueDate);
    });

    if (completed.length === 0) return 0;
    return Math.round((onTime.length / completed.length) * 100);
  },

  getCompletionRate: () => {
    const tasks = get().tasks.filter((t) => !t.isArchived && !t.isDeleted);
    const completed = tasks.filter((t) => t.completed);
    if (tasks.length === 0) return 0;
    return Math.round((completed.length / tasks.length) * 100);
  },

  getStreak: () => {
    const habits = get().habits;
    if (habits.length === 0) return 0;
    return Math.min(...habits.map((h) => h.streak));
  },
});

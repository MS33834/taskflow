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
    const idSet = new Set(taskIds);
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    const now = new Date();
    for (const t of get().tasks) {
      if (!idSet.has(t.id)) continue;
      total++;
      if (t.completed) completed++;
      if (t.status === 'in-progress') inProgress++;
      if (!t.completed && t.dueDate && new Date(t.dueDate) < now) overdue++;
    }
    return { total, completed, inProgress, overdue };
  },

  getProductivityScore: () => {
    let completed = 0;
    let onTime = 0;
    for (const t of get().tasks) {
      if (t.isArchived || t.isDeleted || !t.completed) continue;
      completed++;
      if (t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate)) {
        onTime++;
      }
    }
    if (completed === 0) return 0;
    return Math.round((onTime / completed) * 100);
  },

  getCompletionRate: () => {
    let total = 0;
    let completed = 0;
    for (const t of get().tasks) {
      if (t.isArchived || t.isDeleted) continue;
      total++;
      if (t.completed) completed++;
    }
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  },

  getStreak: () => {
    const habits = get().habits;
    if (habits.length === 0) return 0;
    return Math.min(...habits.map((h) => h.streak));
  },
});

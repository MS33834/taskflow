// Habits Slice — 习惯管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { Habit } from '../../types';
import { generateId } from '../constants';

export interface HabitsSlice {
  habits: Habit[];
  selectedHabit: Habit | null;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  selectHabit: (habit: Habit | null) => void;
  completeHabit: (id: string, date: string) => void;
  uncompleteHabit: (id: string, date: string) => void;
  getHabitStreak: (id: string) => number;
}

export const createHabitsSlice: StateCreator<AppStore, [], [], HabitsSlice> = (set, get) => ({
  habits: [],
  selectedHabit: null,

  addHabit: (habit) => {
    const id = generateId();
    const newHabit: Habit = {
      ...habit,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ habits: [...state.habits, newHabit] }));
    get().saveData();
    return id;
  },

  updateHabit: (id, updates) => {
    set((state) => ({
      habits: state.habits.map((habit) =>
        habit.id === id ? { ...habit, ...updates, updatedAt: new Date() } : habit
      ),
    }));
    get().saveData();
  },

  deleteHabit: (id) => {
    set((state) => ({
      habits: state.habits.filter((habit) => habit.id !== id),
      selectedHabit: state.selectedHabit?.id === id ? null : state.selectedHabit,
    }));
    get().saveData();
  },

  selectHabit: (habit) => set({ selectedHabit: habit }),

  completeHabit: (id, date) => {
    const habit = get().habits.find((h) => h.id === id);
    if (habit) {
      const newHistory = { ...habit.completionHistory, [date]: true };
      const streak = get().getHabitStreak(id) + 1;
      get().updateHabit(id, {
        completionHistory: newHistory,
        streak,
        bestStreak: Math.max(habit.bestStreak, streak),
        totalCompletions: habit.totalCompletions + 1,
      });
    }
  },

  uncompleteHabit: (id, date) => {
    const habit = get().habits.find((h) => h.id === id);
    if (habit) {
      const newHistory = { ...habit.completionHistory };
      delete newHistory[date];
      get().updateHabit(id, {
        completionHistory: newHistory,
        totalCompletions: Math.max(0, habit.totalCompletions - 1),
      });
    }
  },

  getHabitStreak: (id) => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return 0;

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      if (habit.completionHistory[dateStr]) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  },
});

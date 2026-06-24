// Goals Slice — 目标管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { Goal } from '../../types';
import { generateId } from '../constants';

export interface GoalsSlice {
  goals: Goal[];
  selectedGoal: Goal | null;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  selectGoal: (goal: Goal | null) => void;
  progressGoal: (id: string, value: number) => void;
  completeGoal: (id: string) => void;
}

export const createGoalsSlice: StateCreator<AppStore, [], [], GoalsSlice> = (set, get) => ({
  goals: [],
  selectedGoal: null,

  addGoal: (goal) => {
    const id = generateId();
    const newGoal: Goal = {
      ...goal,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ goals: [...state.goals, newGoal] }));
    get().saveData();
    return id;
  },

  updateGoal: (id, updates) => {
    set((state) => ({
      goals: state.goals.map((goal) =>
        goal.id === id ? { ...goal, ...updates, updatedAt: new Date() } : goal
      ),
    }));
    get().saveData();
  },

  deleteGoal: (id) => {
    set((state) => ({
      goals: state.goals.filter((goal) => goal.id !== id),
      selectedGoal: state.selectedGoal?.id === id ? null : state.selectedGoal,
    }));
    get().saveData();
  },

  selectGoal: (goal) => set({ selectedGoal: goal }),

  progressGoal: (id, value) => {
    const goal = get().goals.find((g) => g.id === id);
    if (goal) {
      const newValue = goal.currentValue + value;
      const progress = Math.min((newValue / goal.targetValue) * 100, 100);
      get().updateGoal(id, {
        currentValue: newValue,
        progress,
        isCompleted: progress >= 100,
        completedAt: progress >= 100 ? new Date() : null,
      });
    }
  },

  completeGoal: (id) => {
    const goal = get().goals.find((g) => g.id === id);
    if (goal) {
      get().updateGoal(id, {
        currentValue: goal.targetValue,
        progress: 100,
        isCompleted: true,
        completedAt: new Date(),
      });
    }
  },
});

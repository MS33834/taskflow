// Reminders Slice — 提醒管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { Reminder } from '../../types';
import { generateId } from '../constants';

export interface RemindersSlice {
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => string;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  snoozeReminder: (id: string, minutes: number) => void;
}

export const createRemindersSlice: StateCreator<AppStore, [], [], RemindersSlice> = (set, get) => ({
  reminders: [],

  addReminder: (reminder) => {
    const id = generateId();
    const newReminder: Reminder = {
      ...reminder,
      id,
      createdAt: new Date(),
    };
    set((state) => ({ reminders: [...state.reminders, newReminder] }));
    get().saveData();
    return id;
  },

  updateReminder: (id, updates) => {
    set((state) => ({
      reminders: state.reminders.map((reminder) =>
        reminder.id === id ? { ...reminder, ...updates } : reminder
      ),
    }));
    get().saveData();
  },

  deleteReminder: (id) => {
    set((state) => ({
      reminders: state.reminders.filter((reminder) => reminder.id !== id),
    }));
    get().saveData();
  },

  snoozeReminder: (id, minutes) => {
    const reminder = get().reminders.find((r) => r.id === id);
    if (reminder) {
      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
      get().updateReminder(id, {
        snoozeCount: reminder.snoozeCount + 1,
        lastSnoozeDate: new Date(),
        customTime: snoozeUntil,
      });
    }
  },
});

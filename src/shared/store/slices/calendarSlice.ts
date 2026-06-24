// Calendar Slice — 日历与事件管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { Calendar, CalendarEvent } from '../../types';
import { generateId } from '../constants';

export interface CalendarSlice {
  calendars: Calendar[];
  events: CalendarEvent[];
  selectedDate: Date;
  calendarViewType: 'day' | 'week' | 'month' | 'year';
  addCalendar: (calendar: Omit<Calendar, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCalendar: (id: string, updates: Partial<Calendar>) => void;
  deleteCalendar: (id: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  setSelectedDate: (date: Date) => void;
  setCalendarViewType: (type: 'day' | 'week' | 'month' | 'year') => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getEventsForRange: (start: Date, end: Date) => CalendarEvent[];
}

export const createCalendarSlice: StateCreator<AppStore, [], [], CalendarSlice> = (set, get) => ({
  calendars: [],
  events: [],
  selectedDate: new Date(),
  calendarViewType: 'month',

  addCalendar: (calendar) => {
    const id = generateId();
    const newCalendar: Calendar = {
      ...calendar,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ calendars: [...state.calendars, newCalendar] }));
    get().saveData();
    return id;
  },

  updateCalendar: (id, updates) => {
    set((state) => ({
      calendars: state.calendars.map((calendar) =>
        calendar.id === id ? { ...calendar, ...updates, updatedAt: new Date() } : calendar
      ),
    }));
    get().saveData();
  },

  deleteCalendar: (id) => {
    set((state) => ({
      calendars: state.calendars.filter((calendar) => calendar.id !== id),
    }));
    get().saveData();
  },

  addEvent: (event) => {
    const id = generateId();
    const newEvent: CalendarEvent = {
      ...event,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ events: [...state.events, newEvent] }));
    get().saveData();
    return id;
  },

  updateEvent: (id, updates) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? { ...event, ...updates, updatedAt: new Date() } : event
      ),
    }));
    get().saveData();
  },

  deleteEvent: (id) => {
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    }));
    get().saveData();
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  setCalendarViewType: (type) => set({ calendarViewType: type }),

  getEventsForDate: (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return get().events.filter((event) => {
      const eventStart = new Date(event.startDate);
      return eventStart >= startOfDay && eventStart <= endOfDay;
    });
  },

  getEventsForRange: (start, end) => {
    return get().events.filter((event) => {
      const eventStart = new Date(event.startDate);
      return eventStart >= start && eventStart <= end;
    });
  },
});

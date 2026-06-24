// AI Slice — AI 建议与洞察状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { AISuggestion, AIInsight } from '../../types';

export interface AISlice {
  aiSuggestions: AISuggestion[];
  aiInsights: AIInsight[];
  addAISuggestion: (suggestion: AISuggestion) => void;
  acceptAISuggestion: (id: string) => void;
  dismissAISuggestion: (id: string) => void;
  clearOldSuggestions: () => void;
}

export const createAISlice: StateCreator<AppStore, [], [], AISlice> = (set) => ({
  aiSuggestions: [],
  aiInsights: [],

  addAISuggestion: (suggestion) => {
    set((state) => ({ aiSuggestions: [...state.aiSuggestions, suggestion] }));
  },

  acceptAISuggestion: (id) => {
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, isAccepted: true } : s
      ),
    }));
  },

  dismissAISuggestion: (id) => {
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, isDismissed: true } : s
      ),
    }));
  },

  clearOldSuggestions: () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    set((state) => ({
      aiSuggestions: state.aiSuggestions.filter(
        (s) => !s.isDismissed && new Date(s.createdAt) > oneWeekAgo
      ),
    }));
  },
});

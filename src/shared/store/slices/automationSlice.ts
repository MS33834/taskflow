// Automation Slice — 自动化规则管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { AutomationRule } from '../../types';
import { generateId } from '../constants';

export interface AutomationSlice {
  automationRules: AutomationRule[];
  addAutomationRule: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAutomationRule: (id: string, updates: Partial<AutomationRule>) => void;
  deleteAutomationRule: (id: string) => void;
  toggleAutomationRule: (id: string) => void;
  executeAutomation: (ruleId: string, context: Record<string, unknown>) => void;
}

export const createAutomationSlice: StateCreator<AppStore, [], [], AutomationSlice> = (set, get) => ({
  automationRules: [],

  addAutomationRule: (rule) => {
    const id = generateId();
    const newRule: AutomationRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ automationRules: [...state.automationRules, newRule] }));
    get().saveData();
    return id;
  },

  updateAutomationRule: (id, updates) => {
    set((state) => ({
      automationRules: state.automationRules.map((rule) =>
        rule.id === id ? { ...rule, ...updates, updatedAt: new Date() } : rule
      ),
    }));
    get().saveData();
  },

  deleteAutomationRule: (id) => {
    set((state) => ({
      automationRules: state.automationRules.filter((rule) => rule.id !== id),
    }));
    get().saveData();
  },

  toggleAutomationRule: (id) => {
    const rule = get().automationRules.find((r) => r.id === id);
    if (rule) {
      get().updateAutomationRule(id, { isEnabled: !rule.isEnabled });
    }
  },

  executeAutomation: async (ruleId, _context) => {
    const rule = get().automationRules.find((r) => r.id === ruleId);
    if (!rule || !rule.isEnabled) return;

    try {
      // Execute actions based on rule
      rule.actions.forEach((_action) => {
        // Action execution logic would go here.
        // The shape of `action` is intentionally left to product requirements;
        // intentionally NOT logging to avoid noisy devtools in production builds.
      });

      get().updateAutomationRule(ruleId, {
        executionCount: rule.executionCount + 1,
        lastExecutedAt: new Date(),
      });
    } catch (error) {
      get().updateAutomationRule(ruleId, {
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
});

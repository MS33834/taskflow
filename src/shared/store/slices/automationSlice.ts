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

  executeAutomation: (ruleId, context) => {
    const rule = get().automationRules.find((r) => r.id === ruleId);
    if (!rule || !rule.isEnabled) return;

    try {
      // context 中的 taskId 是触发规则的来源任务
      const contextTaskId = context.taskId as string | undefined;

      for (const action of rule.actions) {
        // 从 action.config 或 context 中获取目标任务 ID
        const taskId = (action.config.taskId as string) || contextTaskId;
        const requiresTaskId = action.type !== 'send-notification' && action.type !== 'webhook' && action.type !== 'custom';
        if (requiresTaskId && !taskId) continue;
        const targetTaskId = taskId as string;

        switch (action.type) {
          case 'update-field': {
            const field = action.config.field as string;
            const value = action.config.value;
            get().updateTask(targetTaskId, { [field]: value } as Record<string, unknown>);
            break;
          }
          case 'add-tag': {
            const tagId = action.config.tagId as string;
            get().addTagToTask(targetTaskId, tagId);
            break;
          }
          case 'remove-tag': {
            const tagId = action.config.tagId as string;
            get().removeTagFromTask(targetTaskId, tagId);
            break;
          }
          case 'move-project': {
            const projectId = action.config.projectId as string;
            get().updateTask(targetTaskId, { projectId });
            break;
          }
          case 'assign': {
            const assigneeId = action.config.assigneeId as string;
            get().updateTask(targetTaskId, { assigneeId });
            break;
          }
          case 'send-notification': {
            const title = (action.config.title as string) || rule.name;
            const message = (action.config.message as string) || rule.description;
            get().addNotification({
              id: generateId(),
              type: 'system',
              title,
              message,
              data: { ruleId, ...context },
              isRead: false,
              isArchived: false,
              actionUrl: null,
              createdAt: new Date(),
            });
            break;
          }
          case 'create-subtask': {
            const title = (action.config.title as string) || '新子任务';
            get().addSubtask(targetTaskId, {
              id: generateId(),
              title,
              completed: false,
              order: 0,
            });
            break;
          }
          case 'duplicate': {
            get().duplicateTask(targetTaskId);
            break;
          }
          case 'archive': {
            get().archiveTask(targetTaskId);
            break;
          }
          case 'webhook': {
            // webhook 动作需要网络请求，异步执行不阻塞自动化流程
            const url = action.config.url as string;
            const method = (action.config.method as string) || 'POST';
            const body = action.config.body;
            if (url) {
              fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
              }).catch((e) => console.warn('Automation webhook failed:', e));
            }
            break;
          }
          case 'custom':
            // 自定义动作需要用户注册处理器，此处无操作
            break;
        }
      }

      get().updateAutomationRule(ruleId, {
        executionCount: rule.executionCount + 1,
        lastExecutedAt: new Date(),
        lastError: null,
      });
    } catch (error) {
      get().updateAutomationRule(ruleId, {
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
});

// Templates Slice — 模板管理状态
import type { StateCreator } from 'zustand';
import type { AppStore } from '../types';
import type { Template } from '../../types';
import { generateId, deepClone } from '../constants';

export interface TemplatesSlice {
  templates: Template[];
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  applyTemplate: (templateId: string, variables?: Record<string, unknown>) => unknown;
}

export const createTemplatesSlice: StateCreator<AppStore, [], [], TemplatesSlice> = (set, get) => ({
  templates: [],

  addTemplate: (template) => {
    const id = generateId();
    const newTemplate: Template = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ templates: [...state.templates, newTemplate] }));
    get().saveData();
    return id;
  },

  updateTemplate: (id, updates) => {
    set((state) => ({
      templates: state.templates.map((template) =>
        template.id === id ? { ...template, ...updates, updatedAt: new Date() } : template
      ),
    }));
    get().saveData();
  },

  deleteTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter((template) => template.id !== id),
    }));
    get().saveData();
  },

  applyTemplate: (templateId, variables = {}) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return null;

    // 对模板变量 key 做正则转义，防止 key 中的特殊字符被解析为正则元字符，
    // 避免 ReDoS（灾难性回溯）与意外替换行为。
    const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let content = deepClone(template.content);
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      content = JSON.parse(JSON.stringify(content).replace(new RegExp(escapeRegExp(placeholder), 'g'), String(value)));
    });

    return content;
  },
});

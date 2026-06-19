import type { Category } from '../types';
import { API_ENDPOINTS } from './config';
import { del, get, patch, post } from './client';
import { camelToSnake, parseDates, snakeToCamel } from './transform';

function toCategory(value: unknown): Category {
  const converted = snakeToCamel(value) as Record<string, unknown>;
  const dated = parseDates(converted) as unknown;
  return dated as Category;
}

export async function fetchCategories(): Promise<Category[]> {
  const raw = await get<unknown[]>(API_ENDPOINTS.categories);
  return raw.map(toCategory);
}

export async function createCategory(
  category: Omit<Category, 'createdAt' | 'updatedAt'>,
): Promise<Category> {
  const body = camelToSnake(category);
  const raw = await post<unknown>(API_ENDPOINTS.categories, body);
  return toCategory(raw);
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
  const body = camelToSnake(updates);
  const raw = await patch<unknown>(`${API_ENDPOINTS.categories}/${id}`, body);
  return toCategory(raw);
}

export async function deleteCategory(id: string): Promise<void> {
  return del(`${API_ENDPOINTS.categories}/${id}`);
}

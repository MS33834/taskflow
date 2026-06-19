import type { Tag } from '../types';
import { API_ENDPOINTS } from './config';
import { del, get, patch, post } from './client';
import { camelToSnake, parseDates, snakeToCamel } from './transform';

function toTag(value: unknown): Tag {
  const converted = snakeToCamel(value) as Record<string, unknown>;
  const dated = parseDates(converted) as unknown;
  return dated as Tag;
}

export async function fetchTags(): Promise<Tag[]> {
  const raw = await get<unknown[]>(API_ENDPOINTS.tags);
  return raw.map(toTag);
}

export async function createTag(tag: Omit<Tag, 'createdAt' | 'updatedAt'>): Promise<Tag> {
  const body = camelToSnake(tag);
  const raw = await post<unknown>(API_ENDPOINTS.tags, body);
  return toTag(raw);
}

export async function updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
  const body = camelToSnake(updates);
  const raw = await patch<unknown>(`${API_ENDPOINTS.tags}/${id}`, body);
  return toTag(raw);
}

export async function deleteTag(id: string): Promise<void> {
  return del(`${API_ENDPOINTS.tags}/${id}`);
}

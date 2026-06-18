import type { Project } from '../types';
import { API_ENDPOINTS } from './config';
import { del, get, patch, post } from './client';
import { camelToSnake, parseDates, snakeToCamel } from './transform';

function toProject(value: unknown): Project {
  const converted = snakeToCamel(value) as Record<string, unknown>;
  const dated = parseDates(converted) as unknown;
  return dated as Project;
}

export async function fetchProjects(): Promise<Project[]> {
  const raw = await get<unknown[]>(API_ENDPOINTS.projects);
  return raw.map(toProject);
}

export async function createProject(
  project: Omit<Project, 'createdAt' | 'updatedAt'>,
): Promise<Project> {
  const body = camelToSnake(project);
  const raw = await post<unknown>(API_ENDPOINTS.projects, body);
  return toProject(raw);
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const body = camelToSnake(updates);
  const raw = await patch<unknown>(`${API_ENDPOINTS.projects}/${id}`, body);
  return toProject(raw);
}

export async function deleteProject(id: string): Promise<void> {
  return del(`${API_ENDPOINTS.projects}/${id}`);
}

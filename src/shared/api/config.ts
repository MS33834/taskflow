const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8000;

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

function getApiBaseUrl(): string {
  const env =
    typeof process !== 'undefined' && process?.env ? process.env : undefined;

  if (env?.EXPO_PUBLIC_API_URL) {
    return env.EXPO_PUBLIC_API_URL;
  }
  if (env?.REACT_APP_API_URL) {
    return env.REACT_APP_API_URL;
  }
  return `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
}

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  tasks: `${API_BASE_URL}/api/v1/tasks`,
  projects: `${API_BASE_URL}/api/v1/tasks/projects`,
  categories: `${API_BASE_URL}/api/v1/tasks/categories`,
  tags: `${API_BASE_URL}/api/v1/tasks/tags`,
};

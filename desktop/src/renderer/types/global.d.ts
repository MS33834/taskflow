import { TaskflowAPI } from '../../preload';

declare global {
  interface Window {
    taskflowAPI: TaskflowAPI;
  }
}

export {};

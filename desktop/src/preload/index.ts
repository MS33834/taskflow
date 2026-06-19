import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('taskflowAPI', {});

export type TaskflowAPI = typeof window.taskflowAPI;

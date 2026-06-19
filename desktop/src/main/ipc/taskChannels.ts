import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { listTasks, createTask, updateTask, deleteTask } from '../repositories/taskRepository';

export function registerTaskChannels(): void {
  ipcMain.handle(IPC_CHANNELS.TASKS.LIST, async () => listTasks());
  ipcMain.handle(IPC_CHANNELS.TASKS.CREATE, async (_, task) => createTask(task));
  ipcMain.handle(IPC_CHANNELS.TASKS.UPDATE, async (_, id, updates) => updateTask(id, updates));
  ipcMain.handle(IPC_CHANNELS.TASKS.DELETE, async (_, id) => deleteTask(id));
}

import { app, ipcMain } from 'electron';
import path from 'path';
import { createMainWindow, registerGlobalShortcuts, unregisterGlobalShortcuts } from './windowManager';
import { unlock, lock, isUnlocked, resetAutoLock } from './services/authService';
import { registerTaskChannels } from './ipc/taskChannels';
import { IPC_CHANNELS } from '../shared/constants';

app.whenReady().then(() => {
  process.env.TASKFLOW_DB_PATH = path.join(app.getPath('userData'), 'taskflow.db');

  createMainWindow();
  registerGlobalShortcuts();

  ipcMain.handle(IPC_CHANNELS.AUTH.UNLOCK, async (_, password: string) => {
    const success = unlock(password);
    if (success) resetAutoLock(5);
    return success;
  });

  ipcMain.handle(IPC_CHANNELS.AUTH.LOCK, async () => {
    lock();
  });

  ipcMain.handle(IPC_CHANNELS.AUTH.IS_UNLOCKED, async () => isUnlocked());

  registerTaskChannels();
});

app.on('window-all-closed', () => {
  unregisterGlobalShortcuts();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  createMainWindow();
});

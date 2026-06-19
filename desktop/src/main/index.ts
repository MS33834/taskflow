import { app, ipcMain } from 'electron';
import path from 'path';
import { createMainWindow, registerGlobalShortcuts, unregisterGlobalShortcuts } from './windowManager';
import { unlock, lock, isUnlocked, resetAutoLock, scheduleClipboardClear } from './services/authService';
import { registerTaskChannels } from './ipc/taskChannels';
import { registerVaultChannels } from './ipc/vaultChannels';
import { registerBackupChannels } from './ipc/backupChannels';
import { IPC_CHANNELS } from '../shared/constants';
import type { SecuritySettings } from '../shared/types';

const defaultSettings: SecuritySettings = {
  lockMethod: 'password',
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  screenshotProtection: false,
  privacyModeEnabled: false,
};

let currentSettings: SecuritySettings = { ...defaultSettings };

app.whenReady().then(() => {
  process.env.TASKFLOW_DB_PATH = path.join(app.getPath('userData'), 'taskflow.db');

  createMainWindow();
  registerGlobalShortcuts();

  ipcMain.handle(IPC_CHANNELS.AUTH.UNLOCK, async (_, password: string) => {
    const success = unlock(password);
    if (success) resetAutoLock(currentSettings.autoLockMinutes);
    return success;
  });

  ipcMain.handle(IPC_CHANNELS.AUTH.LOCK, async () => {
    lock();
  });

  ipcMain.handle(IPC_CHANNELS.AUTH.IS_UNLOCKED, async () => isUnlocked());

  ipcMain.handle(IPC_CHANNELS.SECURITY.GET_SETTINGS, async () => currentSettings);

  ipcMain.handle(IPC_CHANNELS.SECURITY.SET_SETTINGS, async (_, settings: SecuritySettings) => {
    currentSettings = { ...settings };
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY.CLEAR_CLIPBOARD, async () => {
    scheduleClipboardClear(currentSettings.clipboardClearSeconds);
    return true;
  });

  registerTaskChannels();
  registerVaultChannels();
  registerBackupChannels();
});

app.on('window-all-closed', () => {
  unregisterGlobalShortcuts();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  createMainWindow();
});

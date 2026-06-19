import { app, ipcMain } from 'electron';
import path from 'path';
import { createMainWindow, registerGlobalShortcuts, unregisterGlobalShortcuts, setContentProtection } from './windowManager';
import { unlock, lock, isUnlocked, scheduleClipboardClear } from './services/authService';
import { registerTaskChannels } from './ipc/taskChannels';
import { registerVaultChannels } from './ipc/vaultChannels';
import { registerBackupChannels } from './ipc/backupChannels';
import { initializeSecuritySettings } from './repositories/securitySettingsRepository';
import {
  getCurrentSettings,
  loadSettingsFromDatabase,
  updateCurrentSettings,
} from './services/securitySettingsState';
import { IPC_CHANNELS } from '../shared/constants';

app.whenReady().then(() => {
  process.env.TASKFLOW_DB_PATH = path.join(app.getPath('userData'), 'taskflow.db');

  createMainWindow();
  setContentProtection(getCurrentSettings().screenshotProtection);
  registerGlobalShortcuts();

  ipcMain.handle(IPC_CHANNELS.AUTH.UNLOCK, async (_, password: string) => {
    const success = unlock(password);
    if (success) {
      initializeSecuritySettings();
      const settings = loadSettingsFromDatabase();
      setContentProtection(settings.screenshotProtection);
    }
    return success;
  });

  ipcMain.handle(IPC_CHANNELS.AUTH.LOCK, async () => {
    lock();
  });

  ipcMain.handle(IPC_CHANNELS.AUTH.IS_UNLOCKED, async () => isUnlocked());

  ipcMain.handle(IPC_CHANNELS.SECURITY.GET_SETTINGS, async () => {
    return getCurrentSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY.SET_SETTINGS, async (_, settings) => {
    updateCurrentSettings(settings);
    setContentProtection(settings.screenshotProtection);
  });

  ipcMain.handle(IPC_CHANNELS.SECURITY.CLEAR_CLIPBOARD, async () => {
    scheduleClipboardClear(getCurrentSettings().clipboardClearSeconds);
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

import { app } from 'electron';
import { createMainWindow, registerGlobalShortcuts, unregisterGlobalShortcuts } from './windowManager';

app.whenReady().then(() => {
  createMainWindow();
  registerGlobalShortcuts();
});

app.on('window-all-closed', () => {
  unregisterGlobalShortcuts();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  createMainWindow();
});

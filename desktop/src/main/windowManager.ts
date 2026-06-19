import { BrowserWindow, globalShortcut } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function setContentProtection(enabled: boolean): void {
  if (!mainWindow) return;

  try {
    mainWindow.setContentProtection(enabled);
  } catch {
    // Linux may not support content protection; fail silently.
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function registerGlobalShortcuts(): void {
  globalShortcut.register('CommandOrControl+L', () => {
    mainWindow?.webContents.send('app:lock');
  });
  globalShortcut.register('CommandOrControl+N', () => {
    mainWindow?.webContents.send('app:newTask');
  });
  globalShortcut.register('Escape', () => {
    mainWindow?.webContents.send('app:togglePrivacy');
  });
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}

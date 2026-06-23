import { BrowserWindow, globalShortcut, app } from 'electron';
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
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
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
  // 注意：Esc 键不再注册为全局快捷键。
  // 全局监听 Escape 会拦截所有应用的 Esc 行为，存在 UX 与潜在安全风险；
  // 隐私模式切换改为在渲染进程内通过局部键盘事件处理。
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}

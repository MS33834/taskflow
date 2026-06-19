import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '../shared/constants';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
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
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle(IPC_CHANNELS.AUTH.UNLOCK, async (_, password: string) => {
  return password === 'test';
});

ipcMain.handle(IPC_CHANNELS.AUTH.IS_UNLOCKED, async () => false);

ipcMain.handle(IPC_CHANNELS.TASKS.LIST, async () => []);
ipcMain.handle(IPC_CHANNELS.VAULT.LIST, async () => []);

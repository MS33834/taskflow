import { ipcMain, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/constants';
import { createBackup, restoreBackup, BACKUP_FILE_EXTENSION, type BackupResult } from '../services/backupService';
import { loadSettingsFromDatabase } from '../services/securitySettingsState';

export function registerBackupChannels(): void {
  ipcMain.handle(IPC_CHANNELS.BACKUP.EXPORT, async (_, defaultFileName?: string): Promise<BackupResult> => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: path.join(
          app.getPath('documents'),
          defaultFileName || `taskflow-backup-${formatDate(new Date())}.${BACKUP_FILE_EXTENSION}`
        ),
        filters: [{ name: 'TaskFlow 备份', extensions: [BACKUP_FILE_EXTENSION] }],
      });

      if (!filePath) return { success: false, message: '用户取消了导出' };

      const backup = createBackup();
      fs.writeFileSync(filePath, backup);
      return { success: true, message: `备份已保存到 ${filePath}` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '导出失败' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP.IMPORT, async (): Promise<BackupResult> => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'TaskFlow 备份', extensions: [BACKUP_FILE_EXTENSION] }],
      });

      if (!filePaths || filePaths.length === 0) {
        return { success: false, message: '用户取消了导入' };
      }

      const encryptedBackup = fs.readFileSync(filePaths[0]);
      const result = restoreBackup(encryptedBackup);
      if (result.success) {
        loadSettingsFromDatabase();
      }
      return result;
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '导入失败' };
    }
  });
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

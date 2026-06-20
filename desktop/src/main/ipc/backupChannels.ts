import { ipcMain, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/constants';
import { createBackup, restoreBackup, BACKUP_FILE_EXTENSION, type BackupResult } from '../services/backupService';
import { loadSettingsFromDatabase } from '../services/securitySettingsState';

/**
 * 将用户传入的默认文件名清洗为纯文件名，防止通过 ../ 或绝对路径
 * 把备份文件写到用户文档目录之外（IPC 路径遍历）。
 */
function sanitizeBackupFileName(input?: string): string {
  if (!input || !input.trim()) {
    return '';
  }

  // 去掉控制字符（0x00-0x1F、0x7F）、空字节和路径分隔符，统一替换为下划线。
  // 使用逐字符过滤代替正则中的控制字符字面量，避免 ESLint no-control-regex 报错，
  // 同时防止渲染进程传入异常字符导致底层路径解析或日志输出出现不可预期行为。
  let cleaned = input
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code <= 0x1f || code === 0x7f || char === '\0') {
        return '';
      }
      if (char === '\\' || char === '/') {
        return '_';
      }
      return char;
    })
    .join('')
    .trim();

  // 拒绝 '.'、'..' 等可能导致 path.join 逃逸的保留名
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return '';
  }

  // 确保最终只是单个文件名，不含任何目录层级
  const baseName = path.basename(cleaned);
  if (!baseName || baseName === '.' || baseName === '..') {
    return '';
  }

  return baseName;
}

export function registerBackupChannels(): void {
  ipcMain.handle(IPC_CHANNELS.BACKUP.EXPORT, async (_, defaultFileName?: string): Promise<BackupResult> => {
    try {
      const safeFileName = sanitizeBackupFileName(defaultFileName);
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: path.join(
          app.getPath('documents'),
          safeFileName || `taskflow-backup-${formatDate(new Date())}.${BACKUP_FILE_EXTENSION}`
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

  ipcMain.handle(IPC_CHANNELS.BACKUP.IMPORT, async (_, password: string, newPassword?: string): Promise<BackupResult> => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'TaskFlow 备份', extensions: [BACKUP_FILE_EXTENSION] }],
      });

      if (!filePaths || filePaths.length === 0) {
        return { success: false, message: '用户取消了导入' };
      }

      if (!password) {
        return { success: false, message: '需要解锁密码才能恢复备份' };
      }

      const encryptedBackup = fs.readFileSync(filePaths[0]);
      const result = restoreBackup(encryptedBackup, password, newPassword);
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

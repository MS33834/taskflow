import { getDatabase } from './dbService';
import {
  encryptWithMasterKey,
  hasVerifier,
  verifyPassword,
  decryptWithPassword,
  setupPassword,
  unlock,
} from './authService';
import { deriveKey, decrypt } from './cryptoService';
import { loadVerifier } from './authStorage';

export const BACKUP_FILE_EXTENSION = 'taskflow-backup';
export const BACKUP_VERSION = 2;

const MIN_PASSWORD_LENGTH = 8;

export interface BackupResult {
  success: boolean;
  message?: string;
}

interface BackupPayload {
  version: number;
  exportedAt: string;
  tables: {
    tasks: unknown[];
    vault_items: unknown[];
    categories: unknown[];
    security_settings: unknown[];
  };
}

interface BackupMetadata {
  version: number;
  keySalt: string;
}

const TABLE_NAMES = ['tasks', 'vault_items', 'categories', 'security_settings'] as const;

const ALLOWED_COLUMNS: Record<(typeof TABLE_NAMES)[number], Set<string>> = {
  tasks: new Set([
    'id',
    'title',
    'description',
    'due_date',
    'reminder_at',
    'repeat_rule',
    'priority',
    'status',
    'category_id',
    'tag_ids',
    'created_at',
    'updated_at',
  ]),
  vault_items: new Set(['id', 'type', 'title', 'fields', 'is_hidden', 'created_at', 'updated_at']),
  categories: new Set(['id', 'name', 'color', 'is_hidden', 'created_at']),
  security_settings: new Set([
    'id',
    'lock_method',
    'auto_lock_minutes',
    'clipboard_clear_seconds',
    'screenshot_protection',
    'privacy_mode_enabled',
  ]),
};

const METADATA_LENGTH_BYTES = 4;

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `密码长度不能少于 ${MIN_PASSWORD_LENGTH} 个字符`,
    };
  }
  return { valid: true };
}

function buildBackupFile(encryptedPayload: Buffer, metadata: BackupMetadata): Buffer {
  const metaBuffer = Buffer.from(JSON.stringify(metadata), 'utf8');
  const lengthBuffer = Buffer.allocUnsafe(METADATA_LENGTH_BYTES);
  lengthBuffer.writeUInt32BE(metaBuffer.length, 0);
  return Buffer.concat([lengthBuffer, metaBuffer, encryptedPayload]);
}

function readBackupMetadata(
  backup: Buffer
): { metadata: BackupMetadata; encrypted: Buffer } | null {
  if (backup.length < METADATA_LENGTH_BYTES) return null;

  const metaLength = backup.readUInt32BE(0);
  const metaEnd = METADATA_LENGTH_BYTES + metaLength;
  if (metaLength === 0 || metaEnd > backup.length) return null;

  try {
    const metadata = JSON.parse(backup.subarray(METADATA_LENGTH_BYTES, metaEnd).toString('utf8'));
    if (
      typeof metadata === 'object' &&
      metadata !== null &&
      metadata.version === BACKUP_VERSION &&
      typeof metadata.keySalt === 'string'
    ) {
      return { metadata, encrypted: backup.subarray(metaEnd) };
    }
  } catch {
    // Fall through to legacy fallback.
  }
  return null;
}

export function createBackup(): Buffer {
  const verifier = loadVerifier();
  if (!verifier) throw new Error('Authentication verifier not found');

  const db = getDatabase();
  const tables: BackupPayload['tables'] = {
    tasks: db.prepare('SELECT * FROM tasks').all(),
    vault_items: db.prepare('SELECT * FROM vault_items').all(),
    categories: db.prepare('SELECT * FROM categories').all(),
    security_settings: db.prepare('SELECT * FROM security_settings').all(),
  };

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };

  const encrypted = encryptWithMasterKey(JSON.stringify(payload));
  const metadata: BackupMetadata = { version: BACKUP_VERSION, keySalt: verifier.salt };
  return buildBackupFile(encrypted, metadata);
}

export function restoreBackup(
  encryptedBackup: Buffer,
  password: string,
  newPassword?: string
): BackupResult {
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return { success: false, message: passwordCheck.message };
  }

  if (newPassword !== undefined) {
    const newPasswordCheck = validatePassword(newPassword);
    if (!newPasswordCheck.valid) {
      return { success: false, message: newPasswordCheck.message };
    }
  }

  const parsed = readBackupMetadata(encryptedBackup);

  if (parsed) {
    return restoreV2Backup(parsed.metadata, parsed.encrypted, password, newPassword);
  }

  // V1 备份在 payload 中明文保存 auth.salt 与 auth.hash，存在离线暴力破解风险，
  // 已于当前版本停止支持。请使用 V2 备份或重新导出数据。
  return {
    success: false,
    message: '不支持的旧版备份格式（V1）。请使用新版备份文件或重新导出数据。',
  };
}

function restoreV2Backup(
  metadata: BackupMetadata,
  encrypted: Buffer,
  password: string,
  newPassword?: string
): BackupResult {
  let plaintext: string;
  try {
    if (hasVerifier()) {
      if (!verifyPassword(password)) {
        return { success: false, message: '解锁密码不正确' };
      }
      plaintext = decryptWithPassword(encrypted, password);
    } else {
      const salt = Buffer.from(metadata.keySalt, 'hex');
      const { key } = deriveKey(password, salt);
      plaintext = decrypt(encrypted, key);

      const appPassword = newPassword ?? password;
      setupPassword(appPassword);
      if (!unlock(appPassword)) {
        return { success: false, message: '无法使用新密码初始化数据库' };
      }
    }
  } catch {
    return { success: false, message: '无法解密备份，请确认使用正确的解锁密码' };
  }

  let payload: BackupPayload;
  try {
    payload = JSON.parse(plaintext);
  } catch {
    return { success: false, message: '备份文件格式不正确' };
  }

  if (payload.version !== BACKUP_VERSION) {
    return { success: false, message: `不支持的备份版本: ${payload.version}` };
  }

  if (!payload.tables || !TABLE_NAMES.every((name) => Array.isArray(payload.tables[name]))) {
    return { success: false, message: '备份文件格式不正确' };
  }

  restoreTables(payload.tables);
  return { success: true, message: '数据恢复成功' };
}

function restoreTables(tables: BackupPayload['tables']): void {
  const db = getDatabase();
  const insert = db.transaction(() => {
    // Clear existing data in reverse dependency order.
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM vault_items').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM security_settings').run();

    for (const row of tables.tasks) {
      insertRow(db, 'tasks', row);
    }
    for (const row of tables.vault_items) {
      insertRow(db, 'vault_items', row);
    }
    for (const row of tables.categories) {
      insertRow(db, 'categories', row);
    }
    for (const row of tables.security_settings) {
      insertRow(db, 'security_settings', row);
    }
  });

  insert();
}

function insertRow(db: ReturnType<typeof getDatabase>, table: (typeof TABLE_NAMES)[number], row: unknown): void {
  if (row === null || typeof row !== 'object') return;

  const record = row as Record<string, unknown>;
  const allowed = ALLOWED_COLUMNS[table];
  const columns = Object.keys(record).filter((column) => allowed.has(column));
  if (columns.length === 0) return;

  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((column) => record[column]);

  db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);
}

import { getDatabase } from './dbService';
import { getMasterKey } from './authService';
import { encrypt, decrypt } from './cryptoService';
import { loadVerifier, saveVerifier } from './authStorage';

export const BACKUP_FILE_EXTENSION = 'taskflow-backup';
export const BACKUP_VERSION = 1;

export interface BackupResult {
  success: boolean;
  message?: string;
}

interface BackupPayload {
  version: number;
  exportedAt: string;
  auth: {
    salt: string;
    hash: string;
  };
  tables: {
    tasks: unknown[];
    vault_items: unknown[];
    categories: unknown[];
    security_settings: unknown[];
  };
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

export function createBackup(): Buffer {
  const key = getMasterKey();
  if (!key) throw new Error('Application is locked');

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
    auth: {
      salt: verifier.salt,
      hash: verifier.hash,
    },
    tables,
  };

  return encrypt(JSON.stringify(payload), key);
}

export function restoreBackup(encryptedBackup: Buffer): BackupResult {
  const key = getMasterKey();
  if (!key) throw new Error('Application is locked');

  let payload: BackupPayload;
  try {
    const decrypted = decrypt(encryptedBackup, key);
    payload = JSON.parse(decrypted);
  } catch {
    return { success: false, message: '无法解密备份，请确认使用正确的解锁密码' };
  }

  if (payload.version !== BACKUP_VERSION) {
    return { success: false, message: `不支持的备份版本: ${payload.version}` };
  }

  if (!payload.tables || !TABLE_NAMES.every((name) => Array.isArray(payload.tables[name]))) {
    return { success: false, message: '备份文件格式不正确' };
  }

  const db = getDatabase();
  const insert = db.transaction(() => {
    // Clear existing data in reverse dependency order.
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM vault_items').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM security_settings').run();

    for (const row of payload.tables.tasks) {
      insertRow(db, 'tasks', row);
    }
    for (const row of payload.tables.vault_items) {
      insertRow(db, 'vault_items', row);
    }
    for (const row of payload.tables.categories) {
      insertRow(db, 'categories', row);
    }
    for (const row of payload.tables.security_settings) {
      insertRow(db, 'security_settings', row);
    }
  });

  insert();

  // Restore the authentication verifier so the same password works after restore.
  saveVerifier(Buffer.from(payload.auth.salt, 'hex'), Buffer.from(payload.auth.hash, 'hex'));

  return { success: true, message: '数据恢复成功' };
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

import Database from 'better-sqlite3-multiple-ciphers';
import { decryptSyncRecord } from './syncCrypto';
import { getDatabase } from '../dbService';
import { encryptWithMasterKey } from '../authService';
import type { SyncRecord } from './syncStorage';
import type { Task, VaultItem, VaultField } from '../../../shared/types';

export interface SyncRecordApplierOptions {
  smk: Buffer;
  db?: Database.Database;
}

export function applySyncRecord(record: SyncRecord, opts: SyncRecordApplierOptions): void {
  const payload = decryptSyncRecord(record.encryptedPayload, opts.smk);

  if (record.deleted) {
    deleteLocalRecord(record.tableName, record.recordId, opts.db);
    return;
  }

  if (record.tableName === 'tasks') {
    applyTask(payload as unknown as Task, opts.db);
  } else if (record.tableName === 'vault_items') {
    applyVaultItem(payload as unknown as VaultItem, opts.db);
  }
}

function applyTask(task: Task, db?: Database.Database): void {
  const resolvedDb = db ?? getDatabase();
  resolvedDb
    .prepare(
      `
      INSERT INTO tasks (id, title, description, due_date, reminder_at, repeat_rule, priority, status, category_id, tag_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        due_date = excluded.due_date,
        reminder_at = excluded.reminder_at,
        repeat_rule = excluded.repeat_rule,
        priority = excluded.priority,
        status = excluded.status,
        category_id = excluded.category_id,
        tag_ids = excluded.tag_ids,
        updated_at = excluded.updated_at
      `
    )
    .run(
      task.id,
      task.title,
      task.description ?? null,
      task.dueDate ?? null,
      task.reminderAt ?? null,
      task.repeatRule ?? null,
      task.priority,
      task.status,
      task.categoryId ?? null,
      JSON.stringify(task.tagIds),
      task.createdAt,
      task.updatedAt
    );
}

function applyVaultItem(item: VaultItem, db?: Database.Database): void {
  const resolvedDb = db ?? getDatabase();
  resolvedDb
    .prepare(
      `
      INSERT INTO vault_items (id, type, title, fields, is_hidden, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        title = excluded.title,
        fields = excluded.fields,
        is_hidden = excluded.is_hidden,
        updated_at = excluded.updated_at
      `
    )
    .run(
      item.id,
      item.type,
      item.title,
      serializeFields(item.fields),
      item.isHidden ? 1 : 0,
      item.createdAt,
      item.updatedAt
    );
}

function deleteLocalRecord(tableName: string, recordId: string, db?: Database.Database): void {
  const resolvedDb = db ?? getDatabase();
  if (tableName === 'tasks') {
    resolvedDb.prepare('DELETE FROM tasks WHERE id = ?').run(recordId);
  } else if (tableName === 'vault_items') {
    resolvedDb.prepare('DELETE FROM vault_items WHERE id = ?').run(recordId);
  }
}

function serializeFields(fields: VaultField[]): string {
  const encryptedFields = fields.map((field) => ({
    ...field,
    value: field.isSensitive ? encryptWithMasterKey(field.value).toString('base64') : field.value,
  }));
  return JSON.stringify(encryptedFields);
}

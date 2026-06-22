import Database from 'better-sqlite3-multiple-ciphers';
import { encryptSyncRecord } from './syncCrypto';
import { insertSyncRecord, incrementSyncClock } from './syncStorage';
import type { Task, VaultItem } from '../../../shared/types';

export interface SyncRecordWriterOptions {
  smk: Buffer;
  db?: Database.Database;
  deviceId?: string;
}

export function writeTaskSyncRecord(task: Task, opts: SyncRecordWriterOptions): void {
  const payload = {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    reminderAt: task.reminderAt,
    repeatRule: task.repeatRule,
    priority: task.priority,
    status: task.status,
    categoryId: task.categoryId,
    tagIds: task.tagIds,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
  writeRecord('tasks', task.id, payload, task.updatedAt, opts);
}

export function writeVaultSyncRecord(item: VaultItem, opts: SyncRecordWriterOptions): void {
  const payload = {
    id: item.id,
    type: item.type,
    title: item.title,
    fields: item.fields,
    isHidden: item.isHidden,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  writeRecord('vault_items', item.id, payload, item.updatedAt, opts);
}

function writeRecord(
  tableName: string,
  recordId: string,
  payload: Record<string, unknown>,
  updatedAt: string,
  opts: SyncRecordWriterOptions
): void {
  const version = incrementSyncClock(opts.db);
  const encryptedPayload = encryptSyncRecord(payload, opts.smk);
  const id = `${tableName}:${recordId}:v${version}`;
  const updatedAtMs = new Date(updatedAt).getTime();
  const deviceVersion: Record<string, number> = opts.deviceId
    ? { [opts.deviceId]: version }
    : {};
  insertSyncRecord(
    {
      id,
      tableName,
      recordId,
      version,
      encryptedPayload,
      updatedAt: updatedAtMs,
      deleted: 0,
      deviceVersion,
    },
    opts.db
  );
}

export function writeDeletedSyncRecord(
  tableName: string,
  recordId: string,
  opts: SyncRecordWriterOptions
): void {
  const version = incrementSyncClock(opts.db);
  const encryptedPayload = encryptSyncRecord({ id: recordId, deleted: true }, opts.smk);
  const id = `${tableName}:${recordId}:v${version}`;
  const deviceVersion: Record<string, number> = opts.deviceId
    ? { [opts.deviceId]: version }
    : {};
  insertSyncRecord(
    {
      id,
      tableName,
      recordId,
      version,
      encryptedPayload,
      updatedAt: Date.now(),
      deleted: 1,
      deviceVersion,
    },
    opts.db
  );
}

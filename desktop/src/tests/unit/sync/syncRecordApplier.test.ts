import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { openDatabase, runMigrations, closeDatabase, getDatabase } from '../../../main/services/dbService';
import {
  generateSyncMasterKey,
  encryptSyncRecord,
} from '../../../main/services/sync/syncCrypto';
import { insertSyncRecord } from '../../../main/services/sync/syncStorage';
import { applySyncRecord } from '../../../main/services/sync/syncRecordApplier';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => os.tmpdir()) },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plain: string) => Buffer.from(plain)),
    decryptString: vi.fn((buf: Buffer) => buf.toString()),
  },
}));

vi.mock('../../../main/services/authService', () => ({
  encryptWithMasterKey: vi.fn((value: string) => Buffer.from(value)),
  decryptWithMasterKey: vi.fn((buf: Buffer) => buf.toString()),
}));

describe('syncRecordApplier', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `taskflow-sync-record-applier-test-${Date.now()}.db`);
    const dbKey = Buffer.alloc(32, 0xab);
    openDatabase(dbKey, dbPath);
    runMigrations();
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
  });

  it('applies a remote task record', () => {
    const smk = generateSyncMasterKey();
    const task = {
      id: 'task-1',
      title: 'Remote Task',
      priority: 'high',
      status: 'todo',
      tagIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const encryptedPayload = encryptSyncRecord(task, smk);
    insertSyncRecord({
      id: 'tasks:task-1:v1',
      tableName: 'tasks',
      recordId: 'task-1',
      version: 1,
      encryptedPayload,
      updatedAt: Date.now(),
      deleted: 0,
    });

    applySyncRecord(
      {
        id: 'tasks:task-1:v1',
        tableName: 'tasks',
        recordId: 'task-1',
        version: 1,
        encryptedPayload,
        updatedAt: Date.now(),
        deleted: 0,
      },
      { smk }
    );

    const row = getDatabase().prepare('SELECT * FROM tasks WHERE id = ?').get('task-1') as {
      title: string;
      priority: string;
    };
    expect(row.title).toBe('Remote Task');
    expect(row.priority).toBe('high');
  });

  it('deletes a local task for deleted sync record', () => {
    const smk = generateSyncMasterKey();
    getDatabase()
      .prepare(
        'INSERT INTO tasks (id, title, priority, status, tag_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run('task-2', 'Local', 'medium', 'todo', '[]', new Date().toISOString(), new Date().toISOString());

    const encryptedPayload = encryptSyncRecord({ id: 'task-2', deleted: true }, smk);
    applySyncRecord(
      {
        id: 'tasks:task-2:v2',
        tableName: 'tasks',
        recordId: 'task-2',
        version: 2,
        encryptedPayload,
        updatedAt: Date.now(),
        deleted: 1,
      },
      { smk }
    );

    const row = getDatabase().prepare('SELECT * FROM tasks WHERE id = ?').get('task-2');
    expect(row).toBeUndefined();
  });
});

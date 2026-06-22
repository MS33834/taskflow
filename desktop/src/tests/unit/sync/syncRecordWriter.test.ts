import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { openDatabase, runMigrations, closeDatabase } from '../../../main/services/dbService';
import { generateSyncMasterKey, decryptSyncRecord } from '../../../main/services/sync/syncCrypto';
import { getSyncRecordById, getSyncState } from '../../../main/services/sync/syncStorage';
import { writeTaskSyncRecord, writeDeletedSyncRecord } from '../../../main/services/sync/syncRecordWriter';
import type { Task } from '../../../shared/types';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => os.tmpdir()) },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plain: string) => Buffer.from(plain)),
    decryptString: vi.fn((buf: Buffer) => buf.toString()),
  },
}));

describe('syncRecordWriter', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `taskflow-sync-record-writer-test-${Date.now()}.db`);
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

  it('writes an encrypted task sync record', () => {
    const smk = generateSyncMasterKey();
    const task: Task = {
      id: 'task-1',
      title: 'Test',
      priority: 'medium',
      status: 'todo',
      tagIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeTaskSyncRecord(task, { smk });

    const state = getSyncState();
    expect(state.localClock).toBe(1);

    const record = getSyncRecordById('tasks:task-1:v1');
    expect(record).not.toBeNull();
    expect(record!.tableName).toBe('tasks');
    expect(record!.deleted).toBe(0);

    const decrypted = decryptSyncRecord(record!.encryptedPayload, smk);
    expect(decrypted.title).toBe('Test');
  });

  it('writes a deleted sync record', () => {
    const smk = generateSyncMasterKey();
    writeDeletedSyncRecord('tasks', 'task-2', { smk });
    const record = getSyncRecordById('tasks:task-2:v1');
    expect(record).not.toBeNull();
    expect(record!.deleted).toBe(1);
  });
});

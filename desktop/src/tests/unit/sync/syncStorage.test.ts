import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { openDatabase, runMigrations, closeDatabase } from '../../../main/services/dbService';
import {
  insertSyncRecord,
  getSyncRecordsForTable,
  getSyncRecordManifest,
  getSyncRecordById,
  upsertSyncDevice,
  listSyncDevices,
  getSyncState,
  incrementSyncClock,
  updateLastSyncAt,
} from '../../../main/services/sync/syncStorage';

const testDbPath = path.join(os.tmpdir(), `taskflow-sync-storage-test-${Date.now()}.db`);
const testKey = Buffer.alloc(32, 0xab);

describe('syncStorage', () => {
  beforeEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    openDatabase(testKey, testDbPath);
    runMigrations();
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('inserts and retrieves sync records', () => {
    insertSyncRecord({
      id: 'tasks:1:v1',
      tableName: 'tasks',
      recordId: '1',
      version: 1,
      encryptedPayload: Buffer.from('encrypted-data'),
      updatedAt: Date.now(),
      deleted: 0,
    });

    const records = getSyncRecordsForTable('tasks');
    expect(records).toHaveLength(1);
    expect(records[0].recordId).toBe('1');
  });

  it('returns a manifest of records', () => {
    const now = Date.now();
    insertSyncRecord({
      id: 'tasks:2:v1',
      tableName: 'tasks',
      recordId: '2',
      version: 1,
      encryptedPayload: Buffer.from('encrypted-data'),
      updatedAt: now,
      deleted: 0,
    });

    const manifest = getSyncRecordManifest('tasks');
    expect(manifest).toHaveLength(1);
    expect(manifest[0].recordId).toBe('2');
    expect(manifest[0].updatedAt).toBe(now);
  });

  it('upserts and lists sync devices', () => {
    upsertSyncDevice({
      deviceId: 'device-1',
      publicKey: 'pubkey-1',
      name: 'Laptop',
      pairedAt: Date.now(),
    });

    const devices = listSyncDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].name).toBe('Laptop');
  });

  it('increments sync clock', () => {
    const state1 = getSyncState();
    expect(state1.localClock).toBe(0);

    incrementSyncClock();
    const state2 = getSyncState();
    expect(state2.localClock).toBe(1);
  });

  it('increments sync clock monotonically', () => {
    const first = incrementSyncClock();
    const second = incrementSyncClock();
    expect(second).toBe(first + 1);
  });

  it('computes manifest hashes from encrypted payload', () => {
    const payload = Buffer.from('encrypted-data');
    insertSyncRecord({
      id: 'tasks:3:v1',
      tableName: 'tasks',
      recordId: '3',
      version: 1,
      encryptedPayload: payload,
      updatedAt: Date.now(),
      deleted: 0,
    });

    const manifest = getSyncRecordManifest('tasks');
    const item = manifest.find((m) => m.recordId === '3');
    expect(item).toBeDefined();
    expect(item!.hash).toBe(createHash('sha256').update(payload).digest('hex'));
  });

  it('keeps the newer record when an older version conflicts', () => {
    const id = 'tasks:4:v1';
    insertSyncRecord({
      id,
      tableName: 'tasks',
      recordId: '4',
      version: 2,
      encryptedPayload: Buffer.from('newer'),
      updatedAt: 2000,
      deleted: 0,
    });

    const result = insertSyncRecord({
      id,
      tableName: 'tasks',
      recordId: '4',
      version: 1,
      encryptedPayload: Buffer.from('older'),
      updatedAt: 1000,
      deleted: 0,
    });

    expect(result).toBe('local');
    expect(getSyncRecordById(id)!.version).toBe(2);
  });

  it('overwrites with the newer record when local version is older', () => {
    const id = 'tasks:5:v1';
    insertSyncRecord({
      id,
      tableName: 'tasks',
      recordId: '5',
      version: 1,
      encryptedPayload: Buffer.from('older'),
      updatedAt: 1000,
      deleted: 0,
    });

    const result = insertSyncRecord({
      id,
      tableName: 'tasks',
      recordId: '5',
      version: 2,
      encryptedPayload: Buffer.from('newer'),
      updatedAt: 2000,
      deleted: 0,
    });

    expect(result).toBe('remote');
    expect(getSyncRecordById(id)!.version).toBe(2);
  });

  it('updates device lastSeenAt on upsert', () => {
    const now = Date.now();
    upsertSyncDevice({
      deviceId: 'device-2',
      publicKey: 'pubkey-2',
      name: 'Phone',
      pairedAt: now,
      lastSeenAt: now,
    });

    const later = now + 1000;
    upsertSyncDevice({
      deviceId: 'device-2',
      publicKey: 'pubkey-2',
      name: 'Phone',
      pairedAt: now,
      lastSeenAt: later,
    });

    const devices = listSyncDevices();
    expect(devices[0].lastSeenAt).toBe(later);
  });

  it('prevents SQL injection through table name parameter', () => {
    expect(() => getSyncRecordsForTable("tasks'; DROP TABLE sync_records; --")).not.toThrow();
    expect(getSyncRecordsForTable('tasks')).toHaveLength(0);
  });

  it('updates last sync timestamp', () => {
    const now = Date.now();
    updateLastSyncAt(now);
    expect(getSyncState().lastSyncAt).toBe(now);
  });
});

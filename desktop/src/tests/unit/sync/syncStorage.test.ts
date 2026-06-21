import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { openDatabase, runMigrations, closeDatabase } from '../../../main/services/dbService';
import {
  insertSyncRecord,
  getSyncRecordsForTable,
  getSyncRecordManifest,
  upsertSyncDevice,
  listSyncDevices,
  getSyncState,
  incrementSyncClock,
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
});

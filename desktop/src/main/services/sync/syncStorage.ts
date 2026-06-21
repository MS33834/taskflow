import { createHash } from 'crypto';
import Database from 'better-sqlite3-multiple-ciphers';
import { getDatabase } from '../dbService';
import { resolveConflict, SyncVersion, ConflictResult } from './conflictResolver';

export interface SyncRecord {
  id: string;
  tableName: string;
  recordId: string;
  version: number;
  encryptedPayload: Buffer;
  updatedAt: number;
  deleted: number;
}

export interface SyncRecordManifestItem {
  id: string;
  recordId: string;
  version: number;
  updatedAt: number;
  hash: string;
}

export interface SyncDevice {
  deviceId: string;
  publicKey: string;
  name: string | null;
  pairedAt: number;
  lastSeenAt: number | null;
}

export interface SyncState {
  localClock: number;
  lastSyncAt: number | null;
}

function resolveDb(db?: Database.Database): Database.Database {
  return db ?? getDatabase();
}

function toSyncVersion(record: SyncRecord): SyncVersion {
  return {
    id: record.id,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

export function insertSyncRecord(record: SyncRecord, db?: Database.Database): ConflictResult {
  const resolvedDb = resolveDb(db);
  const existing = getSyncRecordById(record.id, resolvedDb);

  if (existing) {
    const result = resolveConflict(toSyncVersion(existing), toSyncVersion(record));
    if (result === 'local') {
      return result;
    }
  }

  const stmt = resolvedDb.prepare(`
    INSERT INTO sync_records (id, table_name, record_id, version, encrypted_payload, updated_at, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      version = excluded.version,
      encrypted_payload = excluded.encrypted_payload,
      updated_at = excluded.updated_at,
      deleted = excluded.deleted
  `);
  stmt.run(
    record.id,
    record.tableName,
    record.recordId,
    record.version,
    record.encryptedPayload,
    record.updatedAt,
    record.deleted
  );
  return 'remote';
}

export function getSyncRecordsForTable(tableName: string, db?: Database.Database): SyncRecord[] {
  const resolvedDb = resolveDb(db);
  const stmt = resolvedDb.prepare(
    'SELECT * FROM sync_records WHERE table_name = ? ORDER BY updated_at DESC'
  );
  return stmt.all(tableName).map(rowToSyncRecord);
}

export function getSyncRecordManifest(tableName?: string, db?: Database.Database): SyncRecordManifestItem[] {
  const resolvedDb = resolveDb(db);
  const sql = tableName
    ? 'SELECT id, record_id, version, updated_at, encrypted_payload FROM sync_records WHERE table_name = ?'
    : 'SELECT id, record_id, version, updated_at, encrypted_payload FROM sync_records';
  const stmt = resolvedDb.prepare(sql);
  const rows = tableName ? stmt.all(tableName) : stmt.all();
  return rows.map((row: any) => ({
    id: row.id,
    recordId: row.record_id,
    version: row.version,
    updatedAt: row.updated_at,
    hash: createHash('sha256').update(row.encrypted_payload.toString('base64')).digest('hex'),
  }));
}

export function getSyncRecordById(id: string, db?: Database.Database): SyncRecord | null {
  const resolvedDb = resolveDb(db);
  const stmt = resolvedDb.prepare('SELECT * FROM sync_records WHERE id = ?');
  const row = stmt.get(id);
  return row ? rowToSyncRecord(row) : null;
}

export function getSyncRecordsByIds(ids: string[], db?: Database.Database): SyncRecord[] {
  const resolvedDb = resolveDb(db);
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const stmt = resolvedDb.prepare(`SELECT * FROM sync_records WHERE id IN (${placeholders})`);
  return stmt.all(...ids).map(rowToSyncRecord);
}

function rowToSyncRecord(row: any): SyncRecord {
  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    version: row.version,
    encryptedPayload: row.encrypted_payload,
    updatedAt: row.updated_at,
    deleted: row.deleted,
  };
}

export function registerSyncDevice(
  device: Omit<SyncDevice, 'lastSeenAt'> & { lastSeenAt?: number },
  db?: Database.Database
): void {
  const resolvedDb = resolveDb(db);
  const stmt = resolvedDb.prepare(`
    INSERT INTO sync_devices (device_id, public_key, name, paired_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      public_key = excluded.public_key,
      name = excluded.name,
      paired_at = excluded.paired_at,
      last_seen_at = excluded.last_seen_at
  `);
  stmt.run(
    device.deviceId,
    device.publicKey,
    device.name ?? null,
    device.pairedAt,
    device.lastSeenAt ?? null
  );
}

export function updateSyncDeviceLastSeen(
  deviceId: string,
  timestamp: number,
  db?: Database.Database
): void {
  const resolvedDb = resolveDb(db);
  const stmt = resolvedDb.prepare('UPDATE sync_devices SET last_seen_at = ? WHERE device_id = ?');
  stmt.run(timestamp, deviceId);
}

export function getSyncDevice(deviceId: string, db?: Database.Database): SyncDevice | null {
  const resolvedDb = resolveDb(db);
  const stmt = resolvedDb.prepare('SELECT * FROM sync_devices WHERE device_id = ?');
  const row = stmt.get(deviceId) as any;
  if (!row) return null;
  return {
    deviceId: row.device_id,
    publicKey: row.public_key,
    name: row.name,
    pairedAt: row.paired_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function removeSyncDevice(deviceId: string, db?: Database.Database): void {
  const resolvedDb = resolveDb(db);
  const stmt = resolvedDb.prepare('DELETE FROM sync_devices WHERE device_id = ?');
  stmt.run(deviceId);
}

export function getTrustedPublicKey(deviceId: string, db?: Database.Database): string | undefined {
  return getSyncDevice(deviceId, db)?.publicKey;
}

export function listSyncDevices(db?: Database.Database): SyncDevice[] {
  const resolvedDb = resolveDb(db);
  const stmt = resolvedDb.prepare('SELECT * FROM sync_devices ORDER BY paired_at DESC');
  return stmt.all().map((row: any) => ({
    deviceId: row.device_id,
    publicKey: row.public_key,
    name: row.name,
    pairedAt: row.paired_at,
    lastSeenAt: row.last_seen_at,
  }));
}

export function getSyncState(db?: Database.Database): SyncState {
  const resolvedDb = resolveDb(db);
  const stmt = resolvedDb.prepare('SELECT local_clock, last_sync_at FROM sync_state WHERE id = 1');
  const row = stmt.get() as { local_clock: number; last_sync_at: number | null } | undefined;
  if (!row) {
    resolvedDb.prepare('INSERT INTO sync_state (id, local_clock, last_sync_at) VALUES (1, 0, NULL)').run();
    return { localClock: 0, lastSyncAt: null };
  }
  return {
    localClock: row.local_clock,
    lastSyncAt: row.last_sync_at,
  };
}

export function incrementSyncClock(db?: Database.Database): number {
  const resolvedDb = resolveDb(db);
  ensureSyncState(resolvedDb);
  resolvedDb.prepare('UPDATE sync_state SET local_clock = local_clock + 1 WHERE id = 1').run();
  return getSyncState(resolvedDb).localClock;
}

export function updateLastSyncAt(timestamp: number, db?: Database.Database): void {
  const resolvedDb = resolveDb(db);
  ensureSyncState(resolvedDb);
  resolvedDb.prepare('UPDATE sync_state SET last_sync_at = ? WHERE id = 1').run(timestamp);
}

function ensureSyncState(db: Database.Database): void {
  const exists = db.prepare('SELECT 1 FROM sync_state WHERE id = 1').get();
  if (!exists) {
    db.prepare('INSERT INTO sync_state (id, local_clock, last_sync_at) VALUES (1, 0, NULL)').run();
  }
}

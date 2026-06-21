import { getDatabase } from '../dbService';

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

export function insertSyncRecord(record: SyncRecord): void {
  const db = getDatabase();
  const stmt = db.prepare(`
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
}

export function getSyncRecordsForTable(tableName: string): SyncRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT * FROM sync_records WHERE table_name = ? ORDER BY updated_at DESC'
  );
  return stmt.all(tableName).map(rowToSyncRecord);
}

export function getSyncRecordManifest(tableName?: string): SyncRecordManifestItem[] {
  const db = getDatabase();
  const sql = tableName
    ? 'SELECT id, record_id, version, updated_at FROM sync_records WHERE table_name = ?'
    : 'SELECT id, record_id, version, updated_at FROM sync_records';
  const stmt = db.prepare(sql);
  const rows = tableName ? stmt.all(tableName) : stmt.all();
  return rows.map((row: any) => ({
    id: row.id,
    recordId: row.record_id,
    version: row.version,
    updatedAt: row.updated_at,
    hash: row.id,
  }));
}

export function getSyncRecordById(id: string): SyncRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sync_records WHERE id = ?');
  const row = stmt.get(id);
  return row ? rowToSyncRecord(row) : null;
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

export function upsertSyncDevice(
  device: Omit<SyncDevice, 'lastSeenAt'> & { lastSeenAt?: number }
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO sync_devices (device_id, public_key, name, paired_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      public_key = excluded.public_key,
      name = excluded.name,
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

export function listSyncDevices(): SyncDevice[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sync_devices ORDER BY paired_at DESC');
  return stmt.all().map((row: any) => ({
    deviceId: row.device_id,
    publicKey: row.public_key,
    name: row.name,
    pairedAt: row.paired_at,
    lastSeenAt: row.last_seen_at,
  }));
}

export function getSyncState(): SyncState {
  const db = getDatabase();
  const stmt = db.prepare('SELECT local_clock, last_sync_at FROM sync_state WHERE id = 1');
  const row = stmt.get() as { local_clock: number; last_sync_at: number | null } | undefined;
  if (!row) {
    db.prepare('INSERT INTO sync_state (id, local_clock, last_sync_at) VALUES (1, 0, NULL)').run();
    return { localClock: 0, lastSyncAt: null };
  }
  return {
    localClock: row.local_clock,
    lastSyncAt: row.last_sync_at,
  };
}

export function incrementSyncClock(): number {
  const db = getDatabase();
  ensureSyncState();
  db.prepare('UPDATE sync_state SET local_clock = local_clock + 1 WHERE id = 1').run();
  return getSyncState().localClock;
}

export function updateLastSyncAt(timestamp: number): void {
  const db = getDatabase();
  ensureSyncState();
  db.prepare('UPDATE sync_state SET last_sync_at = ? WHERE id = 1').run(timestamp);
}

function ensureSyncState(): void {
  const db = getDatabase();
  const exists = db.prepare('SELECT 1 FROM sync_state WHERE id = 1').get();
  if (!exists) {
    db.prepare('INSERT INTO sync_state (id, local_clock, last_sync_at) VALUES (1, 0, NULL)').run();
  }
}

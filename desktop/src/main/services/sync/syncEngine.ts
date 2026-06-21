import { EventEmitter } from 'events';
import Database from 'better-sqlite3-multiple-ciphers';
import { SyncSession } from './syncSession';
import {
  SyncMessage,
  ManifestMessage,
  RequestMessage,
  BatchMessage,
  AckMessage,
  WireSyncRecord,
  ManifestRecordItem,
} from './syncMessages';
import {
  SyncRecord,
  SyncRecordManifestItem,
  SyncDevice,
  getSyncRecordManifest,
  getSyncRecordsByIds,
  insertSyncRecord,
  getSyncRecordById,
  updateLastSyncAt,
  listSyncDevices,
} from './syncStorage';
import { resolveConflict } from './conflictResolver';

export interface SyncStore {
  getManifest(tableName?: string): SyncRecordManifestItem[];
  getRecordsByIds(ids: string[]): SyncRecord[];
  getRecordById(id: string): SyncRecord | null;
  insertRecord(record: SyncRecord): void;
  listDevices(): SyncDevice[];
  updateLastSyncAt(timestamp: number): void;
}

export function createDbSyncStore(db: Database.Database): SyncStore {
  return {
    getManifest: (tableName?: string) => getSyncRecordManifest(tableName, db),
    getRecordsByIds: (ids) => getSyncRecordsByIds(ids, db),
    getRecordById: (id) => getSyncRecordById(id, db),
    insertRecord: (record) => insertSyncRecord(record, db),
    listDevices: () => listSyncDevices(db),
    updateLastSyncAt: (timestamp) => updateLastSyncAt(timestamp, db),
  };
}

export interface SyncEngineOptions {
  session: SyncSession;
  smk: Buffer;
  store: SyncStore;
  tables: string[];
}

export class SyncEngine extends EventEmitter {
  private session: SyncSession;
  private store: SyncStore;
  private tables: string[];
  private smk: Buffer;
  private pendingRequests = new Set<string>();
  private pendingAcks = new Set<string>();
  private localManifestSent = false;
  private remoteManifestReceived = false;

  constructor(opts: SyncEngineOptions) {
    super();
    this.session = opts.session;
    this.store = opts.store;
    this.tables = opts.tables;
    this.smk = opts.smk;

    this.session.on('ready', () => this.sendManifest());
    this.session.on('message', (msg) => this.handleMessage(msg));
    this.session.on('error', (err) => this.emit('error', err));
    this.session.on('close', () => this.emit('close'));
  }

  start(): void {
    if (this.session.isReady()) {
      this.sendManifest();
    }
  }

  private sendManifest(): void {
    const records: ManifestRecordItem[] = [];
    for (const table of this.tables) {
      records.push(
        ...this.store.getManifest(table).map((item) => ({
          id: item.id,
          updatedAt: item.updatedAt,
          hash: item.hash,
        }))
      );
    }
    this.localManifestSent = true;
    this.session.send({ type: 'MANIFEST', records });
    this.checkComplete();
  }

  private handleMessage(msg: SyncMessage): void {
    switch (msg.type) {
      case 'MANIFEST':
        this.handleManifest(msg);
        break;
      case 'REQUEST':
        this.handleRequest(msg);
        break;
      case 'BATCH':
        this.handleBatch(msg);
        break;
      case 'ACK':
        this.handleAck(msg);
        break;
      case 'ERROR':
        this.emit('error', new Error(`Peer error ${msg.code}: ${msg.message}`));
        break;
    }
  }

  private handleManifest(msg: ManifestMessage): void {
    this.remoteManifestReceived = true;
    const localMap = new Map<string, SyncRecordManifestItem>();
    for (const table of this.tables) {
      for (const item of this.store.getManifest(table)) {
        localMap.set(item.id, item);
      }
    }

    const missing: string[] = [];
    for (const remote of msg.records) {
      const local = localMap.get(remote.id);
      if (
        !local ||
        remote.updatedAt > local.updatedAt ||
        (remote.updatedAt === local.updatedAt && remote.hash !== local.hash)
      ) {
        missing.push(remote.id);
      }
    }

    if (missing.length > 0) {
      for (const id of missing) this.pendingRequests.add(id);
      this.session.send({ type: 'REQUEST', recordIds: missing });
    }

    this.checkComplete();
  }

  private handleRequest(msg: RequestMessage): void {
    if (msg.recordIds.length === 0) return;
    const records = this.store.getRecordsByIds(msg.recordIds);
    const wireRecords: WireSyncRecord[] = records.map((r) => ({
      id: r.id,
      tableName: r.tableName,
      recordId: r.recordId,
      version: r.version,
      encryptedPayload: r.encryptedPayload.toString('base64'),
      updatedAt: r.updatedAt,
      deleted: r.deleted,
    }));
    for (const r of records) this.pendingAcks.add(r.id);
    this.session.send({ type: 'BATCH', records: wireRecords });
  }

  private handleBatch(msg: BatchMessage): void {
    const receivedIds: string[] = [];
    for (const wire of msg.records) {
      const record: SyncRecord = {
        id: wire.id,
        tableName: wire.tableName,
        recordId: wire.recordId,
        version: wire.version,
        encryptedPayload: Buffer.from(wire.encryptedPayload, 'base64'),
        updatedAt: wire.updatedAt,
        deleted: wire.deleted,
      };

      const local = this.store.getRecordById(record.id);
      let apply = false;
      if (!local) {
        apply = true;
      } else {
        const decision = resolveConflict(
          { id: local.id, updatedAt: local.updatedAt, version: local.version },
          { id: record.id, updatedAt: record.updatedAt, version: record.version }
        );
        apply = decision === 'remote';
      }

      if (apply) {
        this.store.insertRecord(record);
        receivedIds.push(record.id);
      }
      this.pendingRequests.delete(record.id);
    }

    if (receivedIds.length > 0) {
      this.session.send({ type: 'ACK', receivedIds });
    }

    this.checkComplete();
  }

  private handleAck(msg: AckMessage): void {
    for (const id of msg.receivedIds) {
      this.pendingAcks.delete(id);
    }
    this.checkComplete();
  }

  private checkComplete(): void {
    if (
      this.localManifestSent &&
      this.remoteManifestReceived &&
      this.pendingRequests.size === 0 &&
      this.pendingAcks.size === 0
    ) {
      this.store.updateLastSyncAt(Date.now());
      this.emit('complete');
    }
  }
}

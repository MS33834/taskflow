import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { openDatabase, runMigrations, closeDatabase } from '../../../main/services/dbService';
import { generateDeviceIdentity } from '../../../main/services/sync/syncIdentity';
import { SyncSession } from '../../../main/services/sync/syncSession';
import { TcpSyncTransport } from '../../../main/services/sync/syncTransports';
import { SyncEngine, createDbSyncStore } from '../../../main/services/sync/syncEngine';
import { insertSyncRecord } from '../../../main/services/sync/syncStorage';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plain: string) => Buffer.from(plain)),
    decryptString: vi.fn((buf: Buffer) => buf.toString()),
  },
}));

describe('LAN sync integration', () => {
  let server: net.Server;
  let port: number;
  let serverSocket: net.Socket | undefined;
  let clientTransport: TcpSyncTransport | undefined;
  const dbKey = Buffer.alloc(32, 0xab);

  beforeEach(async () => {
    server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as net.AddressInfo).port;
  });

  afterEach(() => {
    clientTransport?.destroy();
    serverSocket?.destroy();
    server.closeAllConnections?.();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('syncs a task record between two SQLite databases over TCP', async () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const trust = new Map([
      [alice.deviceId, alice.publicKeyPem],
      [bob.deviceId, bob.publicKeyPem],
    ]);

    const dbAPath = path.join(os.tmpdir(), `taskflow-lan-a-${Date.now()}.db`);
    const dbBPath = path.join(os.tmpdir(), `taskflow-lan-b-${Date.now()}.db`);
    for (const p of [dbAPath, dbBPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    const dbA = openDatabase(dbKey, dbAPath);
    runMigrations();
    const record = {
      id: 'tasks:1:v1',
      tableName: 'tasks',
      recordId: '1',
      version: 1,
      encryptedPayload: Buffer.from('encrypted-task-payload'),
      updatedAt: 1000,
      deleted: 0,
    };
    insertSyncRecord(record);

    const dbB = openDatabase(dbKey, dbBPath);
    runMigrations();

    const serverComplete = new Promise<void>((resolve) => {
      server.once('connection', (socket) => {
        serverSocket = socket;
        const sessionB = new SyncSession({
          identity: bob,
          isInitiator: false,
          getTrustedPublicKey: (id) => trust.get(id),
        });
        new TcpSyncTransport({ session: sessionB, role: 'responder', socket });
        const engineB = new SyncEngine({
          session: sessionB,
          smk: dbKey,
          store: createDbSyncStore(dbB),
          tables: ['tasks'],
        });
        engineB.on('complete', resolve);
      });
    });

    const sessionA = new SyncSession({
      identity: alice,
      isInitiator: true,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    clientTransport = new TcpSyncTransport({
      session: sessionA,
      role: 'initiator',
      host: '127.0.0.1',
      port,
    });
    const engineA = new SyncEngine({
      session: sessionA,
      smk: dbKey,
      store: createDbSyncStore(dbA),
      tables: ['tasks'],
    });
    const clientComplete = new Promise<void>((resolve) => engineA.on('complete', resolve));

    await Promise.all([serverComplete, clientComplete]);

    clientTransport.destroy();
    serverSocket?.destroy();

    const stored = dbB.prepare('SELECT * FROM sync_records WHERE id = ?').get(record.id);
    expect(stored).toBeDefined();
    expect((stored as any).record_id).toBe('1');

    dbA.close();
    closeDatabase();
    for (const p of [dbAPath, dbBPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });
});

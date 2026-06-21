import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';
import { once, EventEmitter } from 'events';
import { createHash } from 'crypto';
import { SyncEngine, SyncStore, MAX_RECORDS_PER_BATCH } from '../../../main/services/sync/syncEngine';
import { SyncSession } from '../../../main/services/sync/syncSession';
import { generateDeviceIdentity } from '../../../main/services/sync/syncIdentity';
import { SyncRecord, SyncRecordManifestItem } from '../../../main/services/sync/syncStorage';
import { SyncMessage } from '../../../main/services/sync/syncMessages';

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

function createMemoryStore(initial: SyncRecord[] = []): SyncStore {
  const records = new Map(initial.map((r) => [r.id, r]));
  return {
    getManifest: (tableName?: string) =>
      Array.from(records.values())
        .filter((r) => !tableName || r.tableName === tableName)
        .map(
          (r): SyncRecordManifestItem => ({
            id: r.id,
            recordId: r.recordId,
            version: r.version,
            updatedAt: r.updatedAt,
            hash: createHash('sha256').update(r.encryptedPayload.toString('base64')).digest('hex'),
          })
        ),
    getRecordsByIds: (ids) =>
      ids.map((id) => records.get(id)).filter((r): r is SyncRecord => !!r),
    getRecordById: (id) => records.get(id) ?? null,
    insertRecord: (r) => records.set(r.id, r),
    listDevices: () => [],
    updateLastSyncAt: () => {},
  };
}

function wireSessions(a: SyncSession, b: SyncSession): void {
  a.on('sendFrame', (mode, payload) => b.feedRawFrame(mode, payload));
  b.on('sendFrame', (mode, payload) => a.feedRawFrame(mode, payload));
}

class MockSyncSession extends EventEmitter {
  send = vi.fn((_msg: SyncMessage) => {});

  isReady(): boolean {
    return true;
  }

  close(): void {
    this.emit('close');
  }
}

describe('syncEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replicates a missing record between two engines', async () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const trust = new Map([
      [alice.deviceId, alice.publicKeyPem],
      [bob.deviceId, bob.publicKeyPem],
    ]);

    const record: SyncRecord = {
      id: 'tasks:1:v1',
      tableName: 'tasks',
      recordId: '1',
      version: 1,
      encryptedPayload: Buffer.from('encrypted-task'),
      updatedAt: 1000,
      deleted: 0,
    };

    const storeA = createMemoryStore([record]);
    const storeB = createMemoryStore([]);

    const sessionA = new SyncSession({
      identity: alice,
      isInitiator: true,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    const sessionB = new SyncSession({
      identity: bob,
      isInitiator: false,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    wireSessions(sessionA, sessionB);

    const engineA = new SyncEngine({
      session: sessionA,
      smk: Buffer.alloc(32),
      store: storeA,
      tables: ['tasks'],
    });
    const engineB = new SyncEngine({
      session: sessionB,
      smk: Buffer.alloc(32),
      store: storeB,
      tables: ['tasks'],
    });

    const complete = Promise.all([once(engineA, 'complete'), once(engineB, 'complete')]);
    sessionA.begin();
    await complete;

    expect(storeB.getRecordById(record.id)).not.toBeNull();
    expect(storeB.getRecordById(record.id)!.encryptedPayload.toString()).toBe('encrypted-task');
  });

  it('applies last-write-wins when records differ', async () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const trust = new Map([
      [alice.deviceId, alice.publicKeyPem],
      [bob.deviceId, bob.publicKeyPem],
    ]);

    const localRecord: SyncRecord = {
      id: 'tasks:1:v1',
      tableName: 'tasks',
      recordId: '1',
      version: 1,
      encryptedPayload: Buffer.from('older'),
      updatedAt: 1000,
      deleted: 0,
    };
    const remoteRecord: SyncRecord = {
      id: 'tasks:1:v1',
      tableName: 'tasks',
      recordId: '1',
      version: 2,
      encryptedPayload: Buffer.from('newer'),
      updatedAt: 2000,
      deleted: 0,
    };

    const storeA = createMemoryStore([remoteRecord]);
    const storeB = createMemoryStore([localRecord]);

    const sessionA = new SyncSession({
      identity: alice,
      isInitiator: true,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    const sessionB = new SyncSession({
      identity: bob,
      isInitiator: false,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    wireSessions(sessionA, sessionB);

    const engineA = new SyncEngine({
      session: sessionA,
      smk: Buffer.alloc(32),
      store: storeA,
      tables: ['tasks'],
    });
    const engineB = new SyncEngine({
      session: sessionB,
      smk: Buffer.alloc(32),
      store: storeB,
      tables: ['tasks'],
    });

    const complete = Promise.all([once(engineA, 'complete'), once(engineB, 'complete')]);
    sessionA.begin();
    await complete;

    expect(storeB.getRecordById(localRecord.id)!.encryptedPayload.toString()).toBe('newer');
  });

  it('sends an error when a request exceeds the id limit', async () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const trust = new Map([
      [alice.deviceId, alice.publicKeyPem],
      [bob.deviceId, bob.publicKeyPem],
    ]);

    const initiator = new SyncSession({
      identity: alice,
      isInitiator: true,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    const responder = new SyncSession({
      identity: bob,
      isInitiator: false,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    wireSessions(initiator, responder);

    const ready = Promise.all([once(initiator, 'ready'), once(responder, 'ready')]);
    initiator.begin();
    await ready;

    const store = createMemoryStore([]);
    const _engine = new SyncEngine({ session: responder, smk: Buffer.alloc(32), store, tables: ['tasks'] });

    const sent: SyncMessage[] = [];
    vi.spyOn(responder, 'send').mockImplementation((msg) => sent.push(msg));

    responder.emit('message', {
      type: 'REQUEST',
      recordIds: Array.from({ length: 501 }, (_, i) => `id-${i}`),
    });

    expect(sent.length).toBeGreaterThan(0);
    const lastPayload = sent[sent.length - 1] as { type: string; code: string };
    expect(lastPayload.type).toBe('ERROR');
    expect(lastPayload.code).toBe('REQUEST_TOO_LARGE');
  });

  it('emits an error when a batch exceeds the record limit', async () => {
    const alice = generateDeviceIdentity('alice');
    const session = new SyncSession({
      identity: alice,
      isInitiator: true,
      getTrustedPublicKey: () => undefined,
    });
    const store = createMemoryStore([]);
    const engine = new SyncEngine({ session, smk: Buffer.alloc(32), store, tables: ['tasks'] });

    const errorPromise = once(engine, 'error');
    session.emit('message', {
      type: 'BATCH',
      records: Array.from({ length: 501 }, (_, i) => ({
        id: `tasks:${i}:v1`,
        tableName: 'tasks',
        recordId: `${i}`,
        version: 1,
        encryptedPayload: Buffer.from('payload').toString('base64'),
        updatedAt: 1000,
        deleted: 0,
      })),
    });

    const [err] = await errorPromise;
    expect((err as Error).message).toContain('maximum');
  });

  it('skips records whose hash does not match the manifest', async () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const trust = new Map([
      [alice.deviceId, alice.publicKeyPem],
      [bob.deviceId, bob.publicKeyPem],
    ]);

    const initiator = new SyncSession({
      identity: alice,
      isInitiator: true,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    const responder = new SyncSession({
      identity: bob,
      isInitiator: false,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    wireSessions(initiator, responder);

    const ready = Promise.all([once(initiator, 'ready'), once(responder, 'ready')]);
    initiator.begin();
    await ready;

    const store = createMemoryStore([]);
    const _engine = new SyncEngine({ session: responder, smk: Buffer.alloc(32), store, tables: ['tasks'] });

    const recordId = 'tasks:1:v1';
    const encryptedPayload = Buffer.from('correct').toString('base64');
    const correctHash = createHash('sha256').update(encryptedPayload).digest('hex');

    const errorPromise = once(_engine, 'error');
    responder.emit('message', {
      type: 'MANIFEST',
      records: [{ id: recordId, updatedAt: 1000, hash: correctHash }],
    });
    responder.emit('message', {
      type: 'BATCH',
      records: [
        {
          id: recordId,
          tableName: 'tasks',
          recordId: '1',
          version: 1,
          encryptedPayload: Buffer.from('tampered').toString('base64'),
          updatedAt: 1000,
          deleted: 0,
        },
      ],
    });

    const [err] = await errorPromise;
    expect((err as Error).message).toContain('Hash mismatch');
    expect(store.getRecordById(recordId)).toBeNull();
  });

  it('acks received records even when the local record wins the conflict', () => {
    const id = 'tasks:1:v1';
    const localRecord: SyncRecord = {
      id,
      tableName: 'tasks',
      recordId: '1',
      version: 2,
      encryptedPayload: Buffer.from('newer'),
      updatedAt: 2000,
      deleted: 0,
    };
    const store = createMemoryStore([localRecord]);
    const session = new MockSyncSession();
    const engine = new SyncEngine({
      session: session as unknown as SyncSession,
      smk: Buffer.alloc(32),
      store,
      tables: ['tasks'],
    });
    engine.start();

    const remotePayload = Buffer.from('older');
    const remoteHash = createHash('sha256')
      .update(remotePayload.toString('base64'))
      .digest('hex');
    session.emit('message', {
      type: 'MANIFEST',
      records: [{ id, updatedAt: 1000, hash: remoteHash }],
    });
    session.emit('message', {
      type: 'BATCH',
      records: [
        {
          id,
          tableName: 'tasks',
          recordId: '1',
          version: 1,
          encryptedPayload: remotePayload.toString('base64'),
          updatedAt: 1000,
          deleted: 0,
        },
      ],
    });

    expect(session.send).toHaveBeenCalledWith({ type: 'ACK', receivedIds: [id] });
    expect(store.getRecordById(id)!.encryptedPayload.toString()).toBe('newer');
  });

  it('sends the manifest only once', () => {
    const session = new MockSyncSession();
    const engine = new SyncEngine({
      session: session as unknown as SyncSession,
      smk: Buffer.alloc(32),
      store: createMemoryStore([]),
      tables: ['tasks'],
    });
    engine.start();
    engine.start();

    const manifests = session.send.mock.calls.filter(([msg]) => (msg as SyncMessage).type === 'MANIFEST');
    expect(manifests).toHaveLength(1);
  });

  it('emits complete only once', async () => {
    const session = new MockSyncSession();
    const engine = new SyncEngine({
      session: session as unknown as SyncSession,
      smk: Buffer.alloc(32),
      store: createMemoryStore([]),
      tables: ['tasks'],
    });
    const handler = vi.fn();
    engine.on('complete', handler);

    engine.start();
    session.emit('message', { type: 'MANIFEST', records: [] });
    session.emit('message', { type: 'ACK', receivedIds: [] });

    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);

    session.emit('message', { type: 'ACK', receivedIds: [] });
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('sends requested records in batches bounded by MAX_RECORDS_PER_BATCH', () => {
    const records: SyncRecord[] = Array.from({ length: MAX_RECORDS_PER_BATCH }, (_, i) => ({
      id: `tasks:${i}:v1`,
      tableName: 'tasks',
      recordId: `${i}`,
      version: 1,
      encryptedPayload: Buffer.from(`payload-${i}`),
      updatedAt: 1000,
      deleted: 0,
    }));
    const store = createMemoryStore(records);
    const session = new MockSyncSession();
    const engine = new SyncEngine({
      session: session as unknown as SyncSession,
      smk: Buffer.alloc(32),
      store,
      tables: ['tasks'],
    });
    engine.start();

    const ids = records.map((r) => r.id);
    session.emit('message', { type: 'REQUEST', recordIds: ids });

    const batches = session.send.mock.calls
      .filter(([msg]) => (msg as SyncMessage).type === 'BATCH')
      .map(([msg]) => msg as Extract<SyncMessage, { type: 'BATCH' }>);

    expect(batches).toHaveLength(1);
    expect(batches[0].records).toHaveLength(MAX_RECORDS_PER_BATCH);
    expect(batches[0].records.map((r) => r.id)).toEqual(ids);
  });
});

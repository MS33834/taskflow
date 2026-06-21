import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';
import { once } from 'events';
import { SyncEngine, SyncStore } from '../../../main/services/sync/syncEngine';
import { SyncSession } from '../../../main/services/sync/syncSession';
import { generateDeviceIdentity } from '../../../main/services/sync/syncIdentity';
import { SyncRecord, SyncRecordManifestItem } from '../../../main/services/sync/syncStorage';

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
            hash: r.encryptedPayload.toString('base64'),
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
});

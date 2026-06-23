import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import net from 'net';
import type Database from 'better-sqlite3-multiple-ciphers';
import { openDatabase, runMigrations, closeDatabase } from '../../../main/services/dbService';
import { generateDeviceIdentity, type DeviceIdentity } from '../../../main/services/sync/syncIdentity';
import {
  generateSyncMasterKey,
  encryptSyncRecord,
} from '../../../main/services/sync/syncCrypto';
import { SyncSession } from '../../../main/services/sync/syncSession';
import { RelayTransport } from '../../../main/services/sync/relayTransport';
import { RelayClient } from '../../../main/services/sync/relayClient';
import { SyncEngine, createDbSyncStore } from '../../../main/services/sync/syncEngine';
import { SyncPeerManager } from '../../../main/services/sync/syncPeerManager';
import {
  insertSyncRecord,
  registerSyncDevice,
  getTrustedPublicKey,
  getSyncRecordById,
} from '../../../main/services/sync/syncStorage';
import { createRelayServer } from '../../../../../relay/src/server';

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

interface VersionVector {
  [deviceId: string]: number;
}

interface PeerHandle {
  session: SyncSession;
  engine: SyncEngine;
  transport: RelayTransport;
}

interface DeviceNode {
  name: string;
  identity: DeviceIdentity;
  db: Database.Database;
  dbPath: string;
  smk: Buffer;
  peers: Map<string, PeerHandle>;
  peerManager: SyncPeerManager;
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo;
      server.close(() => resolve(address.port));
    });
  });
}

function createDeviceNode(
  name: string,
  identity: DeviceIdentity,
  allIdentities: DeviceIdentity[],
  smk: Buffer,
  baseDir: string
): DeviceNode {
  const dbPath = path.join(baseDir, `${name}.db`);
  const db = openDatabase(smk, dbPath);
  runMigrations();

  for (const id of allIdentities) {
    registerSyncDevice(
      {
        deviceId: id.deviceId,
        publicKey: id.publicKeyPem,
        name: id.name,
        pairedAt: 1,
      },
      db
    );
  }

  return {
    name,
    identity,
    db,
    dbPath,
    smk,
    peers: new Map(),
    peerManager: new SyncPeerManager(),
  };
}

function connectNodes(
  local: DeviceNode,
  remote: DeviceNode,
  wsUrl: string,
  token: string,
  role: 'initiator' | 'responder'
): { transport: RelayTransport; ready: Promise<PeerHandle> } {
  let transport: RelayTransport;
  let resolveReady: (peer: PeerHandle) => void;
  const ready = new Promise<PeerHandle>((resolve) => {
    resolveReady = resolve;
  });

  const createSession = () =>
    new SyncSession({
      identity: local.identity,
      isInitiator: role === 'initiator',
      getTrustedPublicKey: (deviceId) => getTrustedPublicKey(deviceId, local.db),
    });

  transport = new RelayTransport({
    url: `${wsUrl}?target=${remote.identity.deviceId}`,
    token,
    role,
    createSession,
    onSession: (session) => {
      const engine = new SyncEngine({
        session,
        smk: local.smk,
        store: createDbSyncStore(local.db),
        tables: ['tasks'],
      });
      const peer: PeerHandle = { session, engine, transport };
      local.peers.set(remote.identity.deviceId, peer);
      local.peerManager.addPeer({
        deviceId: remote.identity.deviceId,
        session,
        engine,
        state: 'connecting',
        lastSyncAt: null,
        error: null,
      });
      resolveReady(peer);
    },
    reconnectBaseMs: 100,
    reconnectMaxMs: 1000,
  });

  return { transport, ready };
}

function collectEngines(nodes: DeviceNode[]): SyncEngine[] {
  const engines: SyncEngine[] = [];
  for (const node of nodes) {
    for (const peer of node.peers.values()) {
      engines.push(peer.engine);
    }
  }
  return engines;
}

function waitForEnginesComplete(engines: SyncEngine[]): Promise<void> {
  return new Promise((resolve) => {
    const completed = new Set<SyncEngine>();
    const handlers = new Map<SyncEngine, () => void>();

    for (const engine of engines) {
      const handler = () => {
        completed.add(engine);
        if (completed.size === engines.length) {
          for (const [e, h] of handlers) e.off('complete', h);
          resolve();
        }
      };
      handlers.set(engine, handler);
      engine.on('complete', handler);
    }
  });
}

function makeTaskPayload(title: string, updatedAt: string) {
  return {
    id: 'task1',
    title,
    priority: 'medium',
    status: 'todo',
    tagIds: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt,
  };
}

function makeSyncRecord(
  id: string,
  version: number,
  updatedAt: number,
  deviceVersion: VersionVector,
  payload: Record<string, unknown>,
  smk: Buffer
) {
  return {
    id,
    tableName: 'tasks',
    recordId: 'task1',
    version,
    encryptedPayload: encryptSyncRecord(payload, smk),
    updatedAt,
    deleted: 0,
    deviceVersion,
  };
}

function safeRemoveSync(target: string, maxRetries = 10): void {
  if (!fs.existsSync(target)) return;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const stats = fs.statSync(target);
      if (stats.isDirectory()) {
        fs.rmSync(target, { recursive: true, force: true });
      } else {
        fs.unlinkSync(target);
      }
      return;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EBUSY' && i < maxRetries - 1) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        continue;
      }
      throw err;
    }
  }
}

describe('multi-peer sync integration', () => {
  let relay: ReturnType<typeof createRelayServer>;
  let port: number;
  let relayUrl: string;
  let wsUrl: string;
  let baseDir: string;
  let nodes: DeviceNode[] = [];
  const smk = generateSyncMasterKey();

  beforeEach(async () => {
    port = await getFreePort();
    relayUrl = `http://127.0.0.1:${port}`;
    wsUrl = `ws://127.0.0.1:${port}/sync`;
    relay = createRelayServer({
      port,
      publicWsUrl: wsUrl,
    });
    await relay.start();

    baseDir = path.join(os.tmpdir(), `taskflow-multi-peer-test-${Date.now()}`);
    fs.mkdirSync(baseDir, { recursive: true });
  });

  afterEach(async () => {
    for (const node of nodes) {
      node.db.close();
    }
    nodes = [];
    closeDatabase();
    await relay.stop();
    safeRemoveSync(baseDir);
  });

  it('broadcasts a record from one device to two peers and detects concurrent writes', async () => {
    const identities: DeviceIdentity[] = [
      generateDeviceIdentity('DeviceA'),
      generateDeviceIdentity('DeviceB'),
      generateDeviceIdentity('DeviceC'),
    ];

    const [idA, idB, idC] = identities;

    const nodeA = createDeviceNode('A', idA, identities, smk, baseDir);
    const nodeB = createDeviceNode('B', idB, identities, smk, baseDir);
    const nodeC = createDeviceNode('C', idC, identities, smk, baseDir);
    nodes = [nodeA, nodeB, nodeC];

    const relayClient = new RelayClient(relayUrl);
    const tokens: Record<string, string> = {};
    for (const node of nodes) {
      const result = await relayClient.registerDevice(node.identity);
      tokens[node.identity.deviceId] = result.token;
    }

    const connections = [
      connectNodes(nodeA, nodeB, wsUrl, tokens[idA.deviceId], 'initiator'),
      connectNodes(nodeB, nodeA, wsUrl, tokens[idB.deviceId], 'responder'),
      connectNodes(nodeA, nodeC, wsUrl, tokens[idA.deviceId], 'initiator'),
      connectNodes(nodeC, nodeA, wsUrl, tokens[idC.deviceId], 'responder'),
      connectNodes(nodeB, nodeC, wsUrl, tokens[idB.deviceId], 'initiator'),
      connectNodes(nodeC, nodeB, wsUrl, tokens[idC.deviceId], 'responder'),
    ];
    const transports = connections.map((c) => c.transport);
    await Promise.all(connections.map((c) => c.ready));

    const allEngines = collectEngines(nodes);
    expect(allEngines).toHaveLength(6);

    // Wait for the initial handshake + manifest exchange to settle on all peers.
    await waitForEnginesComplete(allEngines);

    // Device A writes the first version and broadcasts it.
    const recordId = 'tasks:task1:current';
    const v1 = makeSyncRecord(
      recordId,
      1,
      1000,
      { [idA.deviceId]: 1 },
      makeTaskPayload('Task v1 from A', '2024-01-01T00:00:01.000Z'),
      smk
    );
    insertSyncRecord(v1, nodeA.db);

    nodeA.peerManager.broadcastLocalChange();

    await vi.waitFor(
      () => {
        expect(getSyncRecordById(recordId, nodeB.db)).not.toBeNull();
        expect(getSyncRecordById(recordId, nodeC.db)).not.toBeNull();
      },
      { timeout: 10000, interval: 100 }
    );

    // Both B and C write a different version of the same task concurrently.
    const v2 = makeSyncRecord(
      recordId,
      2,
      2000,
      { [idA.deviceId]: 1, [idB.deviceId]: 1 },
      makeTaskPayload('Task v2 from B', '2024-01-01T00:00:02.000Z'),
      smk
    );
    const v3 = makeSyncRecord(
      recordId,
      3,
      2000,
      { [idA.deviceId]: 1, [idC.deviceId]: 1 },
      makeTaskPayload('Task v3 from C', '2024-01-01T00:00:03.000Z'),
      smk
    );

    insertSyncRecord(v2, nodeB.db);
    insertSyncRecord(v3, nodeC.db);

    const concurrentEvents: Array<{
      node: string;
      peer: string;
      recordId: string;
      localDeviceVersion: VersionVector;
      remoteDeviceVersion: VersionVector;
    }> = [];

    for (const node of nodes) {
      for (const [peerId, peer] of node.peers) {
        peer.engine.on('concurrentWrite', (event: {
          recordId: string;
          localDeviceVersion: VersionVector;
          remoteDeviceVersion: VersionVector;
        }) => {
          concurrentEvents.push({
            node: node.name,
            peer: peerId,
            ...event,
          });
        });
      }
    }

    nodeB.peerManager.broadcastLocalChange();
    nodeC.peerManager.broadcastLocalChange();

    // Wait for the concurrent writes to propagate and be reported.
    await vi.waitFor(
      () => {
        const deviceNames = new Set(concurrentEvents.map((e) => e.node));
        expect(deviceNames).toContain('A');
        expect(deviceNames).toContain('B');
        expect(deviceNames).toContain('C');
      },
      { timeout: 10000, interval: 100 }
    );

    // Ensure every device ends up with a non-empty version vector for the record.
    for (const node of nodes) {
      const stored = getSyncRecordById(recordId, node.db);
      expect(stored).not.toBeNull();
      expect(Object.keys(stored!.deviceVersion).length).toBeGreaterThan(0);
    }

    for (const transport of transports) {
      transport.destroy();
    }
  }, 30000);
});

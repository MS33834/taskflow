import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { generateKeyPairSync } from 'crypto';
import { openDatabase, runMigrations, closeDatabase } from '../../../main/services/dbService';
import { getDeviceFingerprint, type DeviceIdentity } from '../../../main/services/sync/syncIdentity';
import {
  generateSyncMasterKey,
  saveSyncMasterKey,
  loadSyncMasterKey,
} from '../../../main/services/sync/syncCrypto';
import {
  generatePairingCode,
  respondToPairing,
  claimPairingCodeAndPair,
  type TokenStorage,
} from '../../../main/services/sync/pairingService';
import { listSyncDevices } from '../../../main/services/sync/syncStorage';
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

function createIdentity(name: string): DeviceIdentity {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return {
    deviceId: getDeviceFingerprint(publicKey),
    name,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

function createTokenStorage(): TokenStorage {
  let value: string | undefined;
  return {
    get: () => value,
    set: (v) => {
      value = v;
    },
  };
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

describe('pairing integration', () => {
  let relay: ReturnType<typeof createRelayServer>;
  let port: number;
  let relayUrl: string;
  let baseDir: string;

  beforeEach(async () => {
    port = await getFreePort();
    relayUrl = `http://127.0.0.1:${port}`;
    relay = createRelayServer({
      port,
      publicWsUrl: `ws://127.0.0.1:${port}/sync`,
    });
    await relay.start();

    baseDir = path.join(os.tmpdir(), `taskflow-pairing-test-${Date.now()}`);
    fs.mkdirSync(baseDir, { recursive: true });
  });

  afterEach(async () => {
    closeDatabase();
    await relay.stop();
    if (fs.existsSync(baseDir)) {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  it('pairs two devices through relay and transfers SMK', async () => {
    const dbKey = Buffer.alloc(32, 0xab);

    const hostDir = path.join(baseDir, 'host');
    const joinerDir = path.join(baseDir, 'joiner');
    fs.mkdirSync(hostDir, { recursive: true });
    fs.mkdirSync(joinerDir, { recursive: true });

    const hostDbPath = path.join(hostDir, 'taskflow.db');
    const joinerDbPath = path.join(joinerDir, 'taskflow.db');
    const hostSmkPath = path.join(hostDir, 'sync-master.key');
    const joinerSmkPath = path.join(joinerDir, 'sync-master.key');

    const hostIdentity = createIdentity('Host');
    const joinerIdentity = createIdentity('Joiner');

    // Prepare host: open DB, run migrations, save SMK.
    const hostDb = openDatabase(dbKey, hostDbPath);
    runMigrations();
    const hostSmk = generateSyncMasterKey();
    saveSyncMasterKey(hostSmk, hostSmkPath);

    // Prepare joiner: open DB and run migrations.
    const joinerDb = openDatabase(dbKey, joinerDbPath);
    runMigrations();

    // Host registers and creates a pairing code.
    const hostTokenStorage = createTokenStorage();
    const codeResult = await generatePairingCode(relayUrl, hostIdentity, hostTokenStorage);
    expect(codeResult.code).toMatch(/^\d{8}$/);

    // Host starts responding to pairing requests.
    const hostToken = hostTokenStorage.get();
    if (!hostToken) {
      throw new Error('host token not issued');
    }
    const hostPromise = respondToPairing(
      `ws://127.0.0.1:${port}/sync`,
      hostToken,
      codeResult.code,
      hostIdentity,
      { db: hostDb, smkPath: hostSmkPath }
    );

    // Joiner claims the pairing code and pairs with the host.
    const joinerTokenStorage = createTokenStorage();
    const joinerResult = await claimPairingCodeAndPair(
      relayUrl,
      joinerIdentity,
      codeResult.code,
      joinerTokenStorage,
      { db: joinerDb, smkPath: joinerSmkPath }
    );

    const hostResult = await hostPromise;

    expect(hostResult.peerDeviceId).toBe(joinerIdentity.deviceId);
    expect(joinerResult.peerDeviceId).toBe(hostIdentity.deviceId);

    // Verify host DB recorded the joiner device.
    const hostDevices = listSyncDevices(hostDb);
    expect(hostDevices).toHaveLength(1);
    expect(hostDevices[0].deviceId).toBe(joinerIdentity.deviceId);
    expect(hostDevices[0].publicKey).toBe(joinerIdentity.publicKeyPem);

    // Verify joiner DB recorded the host device and received the same SMK.
    const joinerDevices = listSyncDevices(joinerDb);
    expect(joinerDevices).toHaveLength(1);
    expect(joinerDevices[0].deviceId).toBe(hostIdentity.deviceId);
    expect(joinerDevices[0].publicKey).toBe(hostIdentity.publicKeyPem);

    const joinerSmk = loadSyncMasterKey(joinerSmkPath);
    expect(joinerSmk).toEqual(hostSmk);

    hostDb.close();
    joinerDb.close();
  });
});

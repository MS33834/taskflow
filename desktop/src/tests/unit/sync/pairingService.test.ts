import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'os';
import { EventEmitter } from 'events';
import {
  generatePairingCode,
  claimPairingCodeAndPair,
  respondToPairing,
} from '../../../main/services/sync/pairingService';
import { RelayClient } from '../../../main/services/sync/relayClient';
import { RelayTransport } from '../../../main/services/sync/relayTransport';
import { generateDeviceIdentity } from '../../../main/services/sync/syncIdentity';
import {
  generateSyncMasterKey,
  loadSyncMasterKey,
  saveSyncMasterKey,
  decryptSessionMessage,
  encryptSessionMessage,
} from '../../../main/services/sync/syncCrypto';
import { registerSyncDevice } from '../../../main/services/sync/syncStorage';
import type { SyncSession } from '../../../main/services/sync/syncSession';

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

vi.mock('../../../main/services/sync/relayClient', () => ({
  RelayClient: vi.fn(),
}));

vi.mock('../../../main/services/sync/relayTransport', () => ({
  RelayTransport: vi.fn(),
}));

vi.mock('../../../main/services/sync/syncCrypto', async () => {
  const actual = await vi.importActual<typeof import('../../../main/services/sync/syncCrypto')>(
    '../../../main/services/sync/syncCrypto'
  );
  return {
    ...actual,
    loadSyncMasterKey: vi.fn(),
    saveSyncMasterKey: vi.fn(),
    decryptSessionMessage: vi.fn(),
  };
});

vi.mock('../../../main/services/sync/syncStorage', () => ({
  registerSyncDevice: vi.fn(),
}));

class MockSyncSession extends EventEmitter {
  private sendKey: Buffer;
  private receiveKey: Buffer;
  private peerIdentity: { deviceId: string; publicKey: string } | null = null;

  constructor(sendKey: Buffer, receiveKey: Buffer) {
    super();
    this.sendKey = sendKey;
    this.receiveKey = receiveKey;
  }

  getSendKey() {
    return this.sendKey;
  }

  getReceiveKey() {
    return this.receiveKey;
  }

  getPeerIdentity() {
    return this.peerIdentity;
  }

  setPeerIdentity(peer: { deviceId: string; publicKey: string }) {
    this.peerIdentity = peer;
  }

  send(msg: unknown) {
    this.emit('send', msg);
  }

  begin() {
    this.emit('ready');
  }
}

function createTokenStorage(initial?: string): { get: () => string | undefined; set: (v: string) => void } {
  let value = initial;
  return {
    get: () => value,
    set: (v) => {
      value = v;
    },
  };
}

describe('pairingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('generates pairing code, registering when no token exists', async () => {
    const identity = generateDeviceIdentity('pairing-host');
    const tokenStorage = createTokenStorage();
    const registerMock = vi.fn().mockResolvedValue({ deviceId: identity.deviceId, token: 'host-token', wsUrl: 'ws://host/sync' });
    const createCodeMock = vi.fn().mockResolvedValue({ code: '12345678', expiresAt: Date.now() + 300_000 });
    vi.mocked(RelayClient).mockImplementation(
      function () {
        return {
          registerDevice: registerMock,
          createPairingCode: createCodeMock,
        } as unknown as RelayClient;
      }
    );

    const result = await generatePairingCode('http://relay', identity, tokenStorage);

    expect(result.code).toBe('12345678');
    expect(registerMock).toHaveBeenCalledWith(identity);
    expect(createCodeMock).toHaveBeenCalledWith(identity, 'host-token');
    expect(tokenStorage.get()).toBe('host-token');
  });

  it('reuses existing token when generating pairing code', async () => {
    const identity = generateDeviceIdentity('pairing-host-2');
    const tokenStorage = createTokenStorage('existing-token');
    const createCodeMock = vi.fn().mockResolvedValue({ code: '87654321', expiresAt: Date.now() + 300_000 });
    vi.mocked(RelayClient).mockImplementation(
      function () {
        return {
          registerDevice: vi.fn(),
          createPairingCode: createCodeMock,
        } as unknown as RelayClient;
      }
    );

    await generatePairingCode('http://relay', identity, tokenStorage);

    expect(createCodeMock).toHaveBeenCalledWith(identity, 'existing-token');
  });

  it('claims pairing code and pairs, saving SMK and registering host device', async () => {
    const joinerIdentity = generateDeviceIdentity('pairing-joiner');
    const hostIdentity = generateDeviceIdentity('pairing-host-3');
    const tokenStorage = createTokenStorage();
    const smk = generateSyncMasterKey();
    const sendKey = Buffer.alloc(32, 0x01);
    const receiveKey = Buffer.alloc(32, 0x02);

    vi.mocked(RelayClient).mockImplementation(
      function () {
        return {
          claimPairingCode: vi.fn().mockResolvedValue({
            deviceId: joinerIdentity.deviceId,
            token: 'joiner-token',
            wsUrl: 'ws://relay/sync',
            pairedDeviceId: hostIdentity.deviceId,
          }),
        } as unknown as RelayClient;
      }
    );

    vi.mocked(RelayTransport).mockImplementation(
      function (_opts: any) {
        const session = new MockSyncSession(sendKey, receiveKey);
        session.setPeerIdentity({ deviceId: hostIdentity.deviceId, publicKey: hostIdentity.publicKeyPem });
        setTimeout(() => {
          _opts.onSession?.(session as unknown as SyncSession);
          setTimeout(() => {
            const encrypted = encryptSessionMessage(smk, sendKey);
            session.emit('message', {
              type: 'SMK_TRANSFER',
              encryptedSmk: encrypted.toString('base64'),
            });
          }, 10);
        }, 0);
        return { destroy: vi.fn() } as unknown as RelayTransport;
      }
    );

    vi.mocked(decryptSessionMessage).mockReturnValue(smk);

    const result = await claimPairingCodeAndPair('http://relay', joinerIdentity, '12345678', tokenStorage);

    expect(result.peerDeviceId).toBe(hostIdentity.deviceId);
    expect(tokenStorage.get()).toBe('joiner-token');
    expect(saveSyncMasterKey).toHaveBeenCalledWith(smk);
    expect(registerSyncDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: hostIdentity.deviceId,
        publicKey: hostIdentity.publicKeyPem,
      })
    );
  });

  it('responds to pairing, sending encrypted SMK and registering joiner device', async () => {
    const hostIdentity = generateDeviceIdentity('pairing-host-4');
    const joinerIdentity = generateDeviceIdentity('pairing-joiner-2');
    const smk = generateSyncMasterKey();
    const sendKey = Buffer.alloc(32, 0x03);

    vi.mocked(loadSyncMasterKey).mockReturnValue(smk);

    let capturedSend: unknown;
    vi.mocked(RelayTransport).mockImplementation(
      function (_opts: any) {
        const session = new MockSyncSession(sendKey, Buffer.alloc(32, 0x04));
        session.setPeerIdentity({ deviceId: joinerIdentity.deviceId, publicKey: joinerIdentity.publicKeyPem });
        session.on('send', (msg) => {
          capturedSend = msg;
        });
        setTimeout(() => {
          _opts.onSession?.(session as unknown as SyncSession);
          setTimeout(() => session.emit('ready'), 10);
        }, 0);
        return { destroy: vi.fn() } as unknown as RelayTransport;
      }
    );

    const result = await respondToPairing('ws://relay/sync', 'host-token', '12345678', hostIdentity);

    expect(result.peerDeviceId).toBe(joinerIdentity.deviceId);
    expect(loadSyncMasterKey).toHaveBeenCalled();
    expect(capturedSend).toEqual(
      expect.objectContaining({
        type: 'SMK_TRANSFER',
        encryptedSmk: expect.any(String),
      })
    );
    expect(registerSyncDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: joinerIdentity.deviceId,
        publicKey: joinerIdentity.publicKeyPem,
      })
    );
  });
});

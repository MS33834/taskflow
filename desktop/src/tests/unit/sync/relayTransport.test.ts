import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import WebSocket, { WebSocketServer } from 'ws';
import { RelayTransport } from '../../../main/services/sync/relayTransport';
import { SyncSession } from '../../../main/services/sync/syncSession';
import { generateDeviceIdentity } from '../../../main/services/sync/syncIdentity';
import { encodeFrame } from '../../../main/services/sync/syncMessages';

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

function parseFrame(raw: Buffer): { mode: number; payload: unknown } {
  const mode = raw[0];
  const len = raw.readUInt32BE(1);
  const payload = JSON.parse(raw.subarray(5, 5 + len).toString('utf8'));
  return { mode, payload };
}

describe('RelayTransport', () => {
  let wss: WebSocketServer;
  let port: number;
  let localIdentity: ReturnType<typeof generateDeviceIdentity>;
  let peerIdentity: ReturnType<typeof generateDeviceIdentity>;

  beforeEach(async () => {
    localIdentity = generateDeviceIdentity('relay-test-local');
    peerIdentity = generateDeviceIdentity('relay-test-peer');
    wss = new WebSocketServer({ port: 0 });
    await new Promise<void>((resolve) => wss.on('listening', resolve));
    port = (wss.address() as WebSocket.AddressInfo).port;
  });

  afterEach(() => {
    wss.clients.forEach((c) => c.terminate());
    return new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  it('connects and sends HELLO when initiator', async () => {
    const received = new Promise<Buffer>((resolve) => {
      wss.once('connection', (ws) => {
        ws.once('message', (data) =>
          resolve(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer))
        );
      });
    });

    const transport = new RelayTransport({
      url: `ws://127.0.0.1:${port}/sync?target=${peerIdentity.deviceId}`,
      token: 'fake-token',
      role: 'initiator',
      createSession: () =>
        new SyncSession({
          identity: localIdentity,
          isInitiator: true,
          getTrustedPublicKey: (id) =>
            id === peerIdentity.deviceId ? peerIdentity.publicKeyPem : undefined,
        }),
    });

    const raw = await received;
    const { mode, payload } = parseFrame(raw);

    expect(mode).toBe(0);
    expect((payload as { type: string }).type).toBe('HELLO');
    expect((payload as { deviceId: string }).deviceId).toBe(localIdentity.deviceId);

    transport.destroy();
  });

  it('receives an incoming HELLO frame as responder and passes it to SyncSession', async () => {
    const received = new Promise<Buffer>((resolve) => {
      wss.once('connection', (ws) => {
        const payload = Buffer.from(
          JSON.stringify({
            type: 'HELLO',
            deviceId: peerIdentity.deviceId,
            publicKey: peerIdentity.publicKeyPem,
            nonce: 'abc',
          })
        );
        ws.send(encodeFrame(0, payload));
        ws.once('message', (data) =>
          resolve(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer))
        );
      });
    });

    const transport = new RelayTransport({
      url: `ws://127.0.0.1:${port}/sync?target=${peerIdentity.deviceId}`,
      token: 'fake-token',
      role: 'responder',
      createSession: () =>
        new SyncSession({
          identity: localIdentity,
          isInitiator: false,
          getTrustedPublicKey: (id) =>
            id === peerIdentity.deviceId ? peerIdentity.publicKeyPem : undefined,
        }),
    });

    const raw = await received;
    const { mode, payload } = parseFrame(raw);

    expect(mode).toBe(0);
    expect((payload as { type: string }).type).toBe('HELLO');
    expect((payload as { deviceId: string }).deviceId).toBe(localIdentity.deviceId);

    transport.destroy();
  });
});

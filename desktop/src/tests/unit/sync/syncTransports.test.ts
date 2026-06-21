import { describe, it, expect, vi } from 'vitest';
import os from 'os';
import net from 'net';
import { once } from 'events';
import { TcpSyncTransport } from '../../../main/services/sync/syncTransports';
import { SyncSession } from '../../../main/services/sync/syncSession';
import { generateDeviceIdentity } from '../../../main/services/sync/syncIdentity';
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

describe('syncTransports', () => {
  it('exchanges an encrypted message over TCP', async () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const trust = new Map([
      [alice.deviceId, alice.publicKeyPem],
      [bob.deviceId, bob.publicKeyPem],
    ]);

    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as net.AddressInfo).port;

    let responderSession: SyncSession | undefined;
    let responderTransport: TcpSyncTransport | undefined;
    const serverReady = new Promise<void>((resolve) => {
      server.once('connection', (socket) => {
        responderSession = new SyncSession({
          identity: bob,
          isInitiator: false,
          getTrustedPublicKey: (id) => trust.get(id),
        });
        responderTransport = new TcpSyncTransport({ session: responderSession, role: 'responder', socket });
        responderSession.on('ready', resolve);
      });
    });

    const initiatorSession = new SyncSession({
      identity: alice,
      isInitiator: true,
      getTrustedPublicKey: (id) => trust.get(id),
    });
    const initiatorTransport = new TcpSyncTransport({
      session: initiatorSession,
      role: 'initiator',
      host: '127.0.0.1',
      port,
    });

    await Promise.all([serverReady, once(initiatorSession, 'ready')]);

    const received: SyncMessage[] = [];
    responderSession!.on('message', (msg) => received.push(msg));
    initiatorSession.send({ type: 'ACK', receivedIds: ['task-1'] });

    await new Promise((resolve) => setTimeout(resolve, 150));
    initiatorTransport.destroy();
    responderTransport?.destroy();
    server.close();

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('ACK');
    expect((received[0] as Extract<SyncMessage, { type: 'ACK' }>).receivedIds).toEqual([
      'task-1',
    ]);
  });

  it('destroys a TCP transport and closes the underlying socket', async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as net.AddressInfo).port;

    const identity = generateDeviceIdentity('transport-test');
    const session = new SyncSession({
      identity,
      isInitiator: true,
      getTrustedPublicKey: () => undefined,
    });

    const transport = new TcpSyncTransport({
      session,
      role: 'initiator',
      host: '127.0.0.1',
      port,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    transport.destroy();

    server.close();
    expect(session).toBeDefined();
  });
});

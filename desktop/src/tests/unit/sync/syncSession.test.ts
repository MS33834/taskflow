import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';
import { once } from 'events';
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

function buildTrustMap(identities: ReturnType<typeof generateDeviceIdentity>[]) {
  return new Map(identities.map((id) => [id.deviceId, id.publicKeyPem]));
}

function wireSessions(a: SyncSession, b: SyncSession): void {
  a.on('sendFrame', (mode, payload) => b.feedRawFrame(mode, payload));
  b.on('sendFrame', (mode, payload) => a.feedRawFrame(mode, payload));
}

describe('syncSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes handshake and sends an encrypted message', async () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const trust = buildTrustMap([alice, bob]);

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

    const received: SyncMessage[] = [];
    responder.on('message', (msg) => received.push(msg));

    initiator.send({ type: 'MANIFEST', records: [] });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('MANIFEST');
  });

  it('rejects a handshake from an unknown device', async () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const trust = new Map<string, string>(); // empty trust

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

    const errorPromise = once(responder, 'error');
    initiator.begin();
    const [err] = await errorPromise;

    expect((err as Error).message).toContain('Unknown device');
  });
});

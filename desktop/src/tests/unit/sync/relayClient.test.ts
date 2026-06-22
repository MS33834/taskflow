import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import { RelayClient } from '../../../main/services/sync/relayClient';
import { generateDeviceIdentity } from '../../../main/services/sync/syncIdentity';

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

function mockFetch(response: { ok: boolean; status: number; json: unknown; text?: string }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: async () => response.json,
    text: async () => response.text ?? '',
  });
}

describe('RelayClient', () => {
  let identity: ReturnType<typeof generateDeviceIdentity>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    identity = generateDeviceIdentity('relay-client-test');
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('registers a device with signed request', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: { deviceId: identity.deviceId, token: 'token-123', wsUrl: 'ws://localhost:8787/sync' },
    });
    global.fetch = fetchMock;

    const client = new RelayClient('http://localhost:8787/');
    const result = await client.registerDevice(identity);

    expect(result).toEqual({
      deviceId: identity.deviceId,
      token: 'token-123',
      wsUrl: 'ws://localhost:8787/sync',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8787/register-device');
    expect(options?.method).toBe('POST');
    const body = JSON.parse(String(options?.body));
    expect(body.deviceId).toBe(identity.deviceId);
    expect(body.publicKey).toBe(identity.publicKeyPem);
    expect(typeof body.timestamp).toBe('number');
    expect(typeof body.signature).toBe('string');
  });

  it('creates a pairing code with Authorization header', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: { code: '12345678', expiresAt: 1234567890 },
    });
    global.fetch = fetchMock;

    const client = new RelayClient('http://localhost:8787');
    const result = await client.createPairingCode(identity, 'token-abc');

    expect(result).toEqual({ code: '12345678', expiresAt: 1234567890 });
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers?.Authorization).toBe('Bearer token-abc');
    const body = JSON.parse(String(options?.body));
    expect(typeof body.timestamp).toBe('number');
    expect(typeof body.signature).toBe('string');
  });

  it('claims a pairing code and returns token', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: {
        deviceId: identity.deviceId,
        token: 'token-xyz',
        wsUrl: 'ws://localhost:8787/sync',
        pairedDeviceId: 'host-device-id',
      },
    });
    global.fetch = fetchMock;

    const client = new RelayClient('http://localhost:8787');
    const result = await client.claimPairingCode(identity, '87654321');

    expect(result).toEqual({
      deviceId: identity.deviceId,
      token: 'token-xyz',
      wsUrl: 'ws://localhost:8787/sync',
      pairedDeviceId: 'host-device-id',
    });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(options?.body));
    expect(body.code).toBe('87654321');
    expect(body.deviceId).toBe(identity.deviceId);
    expect(body.publicKey).toBe(identity.publicKeyPem);
    expect(typeof body.timestamp).toBe('number');
    expect(typeof body.signature).toBe('string');
  });

  it('throws on HTTP error', async () => {
    const fetchMock = mockFetch({
      ok: false,
      status: 401,
      json: {},
      text: 'unauthorized',
    });
    global.fetch = fetchMock;

    const client = new RelayClient('http://localhost:8787');
    await expect(client.registerDevice(identity)).rejects.toThrow('register-device failed: 401 unauthorized');
  });
});

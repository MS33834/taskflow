import { describe, it, expect, vi } from 'vitest';
import os from 'os';
import {
  generateDeviceIdentity,
  loadDeviceIdentity,
  getDeviceFingerprint,
  signMessage,
  verifySignature,
} from '../../../main/services/sync/syncIdentity';

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

describe('syncIdentity', () => {
  it('generates a device identity with public/private keys', () => {
    const identity = generateDeviceIdentity('test-device');
    expect(identity.name).toBe('test-device');
    expect(identity.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(identity.privateKeyPem).toContain('BEGIN PRIVATE KEY');
  });

  it('loads previously generated identity', () => {
    const first = generateDeviceIdentity('device-a');
    const loaded = loadDeviceIdentity();
    expect(loaded).not.toBeNull();
    expect(loaded!.publicKeyPem).toBe(first.publicKeyPem);
    expect(loaded!.privateKeyPem).toBe(first.privateKeyPem);
  });

  it('produces a consistent fingerprint', () => {
    const identity = generateDeviceIdentity('device-b');
    const fp1 = getDeviceFingerprint(identity.publicKeyPem);
    const fp2 = getDeviceFingerprint(identity.publicKeyPem);
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBeGreaterThan(0);
  });

  it('signs and verifies messages', () => {
    const identity = generateDeviceIdentity('device-c');
    const message = Buffer.from('hello sync');
    const signature = signMessage(message, identity.privateKeyPem);
    const valid = verifySignature(message, signature, identity.publicKeyPem);
    expect(valid).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const identity = generateDeviceIdentity('device-d');
    const message = Buffer.from('hello sync');
    const signature = signMessage(message, identity.privateKeyPem);
    const tampered = Buffer.from('goodbye sync');
    const valid = verifySignature(tampered, signature, identity.publicKeyPem);
    expect(valid).toBe(false);
  });
});

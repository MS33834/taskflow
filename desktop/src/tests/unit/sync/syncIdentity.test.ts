import { describe, it, expect, vi } from 'vitest';
import os from 'os';
import fs from 'fs';
import path from 'path';
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

import { safeStorage } from 'electron';

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

  it('returns null when identity file is missing', () => {
    const identityPath = path.join(os.tmpdir(), 'taskflow-device-identity.json');
    fs.rmSync(identityPath, { force: true });
    expect(loadDeviceIdentity()).toBeNull();
  });

  it('returns null when encrypted identity is loaded without safeStorage', () => {
    generateDeviceIdentity('device-e');
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
    expect(loadDeviceIdentity()).toBeNull();
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
  });

  it('rejects signatures from a different device', () => {
    const alice = generateDeviceIdentity('alice');
    const bob = generateDeviceIdentity('bob');
    const message = Buffer.from('hello sync');
    const signature = signMessage(message, alice.privateKeyPem);
    expect(verifySignature(message, signature, bob.publicKeyPem)).toBe(false);
  });

  it('returns false for malformed public keys', () => {
    const identity = generateDeviceIdentity('device-f');
    const message = Buffer.from('hello sync');
    const signature = signMessage(message, identity.privateKeyPem);
    expect(verifySignature(message, signature, 'not-a-valid-pem')).toBe(false);
  });

  it('produces a fingerprint from raw public key bytes', () => {
    const identity = generateDeviceIdentity('device-g');
    const fp1 = getDeviceFingerprint(identity.publicKeyPem);
    const fp2 = getDeviceFingerprint(identity.publicKeyPem);
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[0-9a-f]{16}$/);
  });
});

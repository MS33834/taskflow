import { describe, it, expect, vi } from 'vitest';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { createPublicKey, createHash } from 'crypto';
import {
  generateDeviceIdentity,
  loadDeviceIdentity,
  saveDeviceIdentity,
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

  it('matches fingerprint computed from the raw public key bytes in the SPKI', () => {
    const identity = generateDeviceIdentity('device-h');
    const spkiDer = createPublicKey(identity.publicKeyPem).export({ type: 'spki', format: 'der' }) as Buffer;
    const raw = spkiDer.subarray(spkiDer.length - 32);
    const expected = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    expect(getDeviceFingerprint(identity.publicKeyPem)).toBe(expected);
  });

  it('refuses to save identity when safeStorage is unavailable', () => {
    const identity = generateDeviceIdentity('device-i');
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
    expect(() => saveDeviceIdentity(identity)).toThrow('safeStorage is not available');
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
  });

  it('throws when loading encrypted identity without safeStorage', () => {
    generateDeviceIdentity('device-j');
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
    expect(() => loadDeviceIdentity()).toThrow('safeStorage is not available');
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
  });

  it('throws when loading a plaintext identity file', () => {
    const identityPath = path.join(os.tmpdir(), `taskflow-device-identity-plain-${Date.now()}.json`);
    fs.writeFileSync(
      identityPath,
      JSON.stringify({ encrypted: false, privateKeyPem: 'secret', deviceId: 'x', name: 'x', publicKeyPem: 'y' })
    );
    expect(() => loadDeviceIdentity(identityPath)).toThrow('Plaintext device identity file found');
    fs.rmSync(identityPath, { force: true });
  });

  it('throws when loading a corrupt identity file', () => {
    const identityPath = path.join(os.tmpdir(), `taskflow-device-identity-corrupt-${Date.now()}.json`);
    fs.writeFileSync(identityPath, 'not-json');
    expect(() => loadDeviceIdentity(identityPath)).toThrow('Corrupt device identity file');
    fs.rmSync(identityPath, { force: true });
  });

  it.skipIf(process.platform === 'win32')('writes identity file with restricted permissions', () => {
    const identityPath = path.join(os.tmpdir(), `taskflow-device-identity-mode-${Date.now()}.json`);
    const identity = generateDeviceIdentity('device-k');
    saveDeviceIdentity(identity, identityPath);
    const stats = fs.statSync(identityPath);
    expect(stats.mode & 0o777).toBe(0o600);
    fs.rmSync(identityPath, { force: true });
  });
});

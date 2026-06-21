import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  generateSyncMasterKey,
  saveSyncMasterKey,
  loadSyncMasterKey,
  encryptSyncRecord,
  decryptSyncRecord,
  deriveSessionKey,
  generateEcdhKeyPair,
  computeSharedSecret,
} from '../../../main/services/sync/syncCrypto';

const testKeyPath = path.join(os.tmpdir(), `taskflow-smk-test-${Date.now()}.key`);

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

describe('syncCrypto', () => {
  beforeEach(() => {
    if (fs.existsSync(testKeyPath)) fs.unlinkSync(testKeyPath);
  });

  it('generates a 32-byte sync master key', () => {
    const key = generateSyncMasterKey();
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('saves and loads the sync master key', () => {
    const key = generateSyncMasterKey();
    saveSyncMasterKey(key, testKeyPath);
    const loaded = loadSyncMasterKey(testKeyPath);
    expect(loaded).not.toBeNull();
    expect(loaded!.equals(key)).toBe(true);
  });

  it('encrypts and decrypts a sync record', () => {
    const smk = generateSyncMasterKey();
    const record = { title: 'task', priority: 'high' };
    const encrypted = encryptSyncRecord(record, smk);
    expect(encrypted).toBeInstanceOf(Buffer);
    const decrypted = decryptSyncRecord(encrypted, smk);
    expect(decrypted).toEqual(record);
  });

  it('derives a 32-byte session key from shared secret', () => {
    const shared = Buffer.alloc(32, 0xab);
    const key = deriveSessionKey(shared, Buffer.alloc(16, 0x12), 'taskflow-sync-v1');
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('generates ECDH key pair and computes matching shared secret', () => {
    const alice = generateEcdhKeyPair();
    const bob = generateEcdhKeyPair();
    const sharedA = computeSharedSecret(alice.privateKeyPem, bob.publicKeyPem);
    const sharedB = computeSharedSecret(bob.privateKeyPem, alice.publicKeyPem);
    expect(sharedA.equals(sharedB)).toBe(true);
    expect(sharedA.length).toBe(32);
  });
});

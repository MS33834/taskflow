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
  deriveSessionKeys,
  encryptSessionMessage,
  decryptSessionMessage,
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

import { safeStorage } from 'electron';

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

  it('uses a unique IV for every encryption', () => {
    const smk = generateSyncMasterKey();
    const record = { title: 'task' };
    const encrypted1 = encryptSyncRecord(record, smk);
    const encrypted2 = encryptSyncRecord(record, smk);
    const iv1 = encrypted1.subarray(0, 12);
    const iv2 = encrypted2.subarray(0, 12);
    expect(iv1.equals(iv2)).toBe(false);
    expect(encrypted1.equals(encrypted2)).toBe(false);
  });

  it('fails to decrypt with a wrong key', () => {
    const smk = generateSyncMasterKey();
    const wrongKey = generateSyncMasterKey();
    const encrypted = encryptSyncRecord({ title: 'task' }, smk);
    expect(() => decryptSyncRecord(encrypted, wrongKey)).toThrow();
  });

  it('fails to decrypt a tampered ciphertext', () => {
    const smk = generateSyncMasterKey();
    const encrypted = encryptSyncRecord({ title: 'task' }, smk);
    encrypted[encrypted.length - 1] ^= 0xff;
    expect(() => decryptSyncRecord(encrypted, smk)).toThrow();
  });

  it('rejects ciphertexts that are too short', () => {
    const smk = generateSyncMasterKey();
    expect(() => decryptSyncRecord(Buffer.alloc(27), smk)).toThrow('Invalid sync record ciphertext');
  });

  it('rejects invalid master keys for encryption and decryption', () => {
    expect(() => encryptSyncRecord({ title: 'task' }, Buffer.alloc(16))).toThrow('Invalid sync master key');
    expect(() => decryptSyncRecord(Buffer.alloc(32), Buffer.alloc(16))).toThrow('Invalid sync master key');
  });

  it('produces different session keys for different salts and info', () => {
    const shared = Buffer.alloc(32, 0xab);
    const salt1 = Buffer.alloc(16, 0x12);
    const salt2 = Buffer.alloc(16, 0x34);
    const key1 = deriveSessionKey(shared, salt1, 'taskflow-sync-v1');
    const key2 = deriveSessionKey(shared, salt2, 'taskflow-sync-v1');
    const key3 = deriveSessionKey(shared, salt1, 'taskflow-sync-v2');
    expect(key1.equals(key2)).toBe(false);
    expect(key1.equals(key3)).toBe(false);
  });

  it('returns null when encrypted key is loaded without safeStorage', () => {
    const key = generateSyncMasterKey();
    saveSyncMasterKey(key, testKeyPath);
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
    expect(loadSyncMasterKey(testKeyPath)).toBeNull();
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
  });

  it('computes matching shared secrets only with the correct key pair', () => {
    const alice = generateEcdhKeyPair();
    const bob = generateEcdhKeyPair();
    const eve = generateEcdhKeyPair();
    const sharedAliceBob = computeSharedSecret(alice.privateKeyPem, bob.publicKeyPem);
    const sharedAliceEve = computeSharedSecret(alice.privateKeyPem, eve.publicKeyPem);
    expect(sharedAliceEve.equals(sharedAliceBob)).toBe(false);
  });

  it('derives different send/receive session keys', () => {
    const shared = Buffer.alloc(32, 0xab);
    const salt = Buffer.alloc(16, 0x12);
    const initiatorKeys = deriveSessionKeys(shared, salt, 'initiator');
    const responderKeys = deriveSessionKeys(shared, salt, 'responder');
    expect(initiatorKeys.sendKey.equals(responderKeys.receiveKey)).toBe(true);
    expect(initiatorKeys.receiveKey.equals(responderKeys.sendKey)).toBe(true);
    expect(initiatorKeys.sendKey.equals(initiatorKeys.receiveKey)).toBe(false);
    expect(initiatorKeys.sendKey.length).toBe(32);
  });

  it('encrypts and decrypts a session message', () => {
    const key = generateSyncMasterKey();
    const plaintext = Buffer.from('hello session');
    const encrypted = encryptSessionMessage(plaintext, key);
    const decrypted = decryptSessionMessage(encrypted, key);
    expect(decrypted.toString()).toBe('hello session');
  });
});

import { describe, it, expect } from 'vitest';
import { deriveKey, generateSalt, encrypt, decrypt, generatePassword } from '../../main/services/cryptoService';

describe('cryptoService', () => {
  it('should encrypt and decrypt text', () => {
    const salt = generateSalt();
    const { key } = deriveKey('master-password', salt);
    const plaintext = 'sensitive data';
    const ciphertext = encrypt(plaintext, key);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it('should generate password of correct length', () => {
    expect(generatePassword(20)).toHaveLength(20);
  });

  it('should produce different ciphertexts for same plaintext', () => {
    const salt = generateSalt();
    const { key } = deriveKey('master-password', salt);
    const c1 = encrypt('data', key);
    const c2 = encrypt('data', key);
    expect(c1.toString('hex')).not.toBe(c2.toString('hex'));
  });
});

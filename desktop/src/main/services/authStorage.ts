import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';

interface Verifier {
  salt: string;
  hash: string;
}

function getVerifierPath(): string {
  return path.join(app.getPath('userData'), 'taskflow-auth.json');
}

export function loadVerifier(): Verifier | null {
  const filePath = getVerifierPath();
  if (!fs.existsSync(filePath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.encrypted && safeStorage.isEncryptionAvailable()) {
      return {
        salt: safeStorage.decryptString(Buffer.from(data.salt, 'base64')),
        hash: safeStorage.decryptString(Buffer.from(data.hash, 'base64')),
      };
    }
    return data;
  } catch {
    return null;
  }
}

export function saveVerifier(salt: Buffer, hash: Buffer): void {
  const filePath = getVerifierPath();
  const userDataDir = path.dirname(filePath);
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  if (safeStorage.isEncryptionAvailable()) {
    const data = {
      encrypted: true,
      salt: safeStorage.encryptString(salt.toString('hex')).toString('base64'),
      hash: safeStorage.encryptString(hash.toString('hex')).toString('base64'),
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
  } else {
    const data = {
      encrypted: false,
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
}

export function clearVerifier(): void {
  const filePath = getVerifierPath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function getBiometricKeyPath(): string {
  return path.join(app.getPath('userData'), 'taskflow-biometric-key.json');
}

export function loadBiometricKey(): Buffer | null {
  const filePath = getBiometricKeyPath();
  if (!fs.existsSync(filePath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.encrypted && safeStorage.isEncryptionAvailable()) {
      return Buffer.from(safeStorage.decryptString(Buffer.from(data.key, 'base64')), 'hex');
    }
    return Buffer.from(data.key, 'hex');
  } catch {
    return null;
  }
}

export function saveBiometricKey(key: Buffer): void {
  const filePath = getBiometricKeyPath();
  const userDataDir = path.dirname(filePath);
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  if (safeStorage.isEncryptionAvailable()) {
    const data = {
      encrypted: true,
      key: safeStorage.encryptString(key.toString('hex')).toString('base64'),
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
  } else {
    const data = {
      encrypted: false,
      key: key.toString('hex'),
    };
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
}

export function clearBiometricKey(): void {
  const filePath = getBiometricKeyPath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

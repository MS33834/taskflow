import { generateKeyPairSync, createHash, sign, verify, createPublicKey } from 'crypto';
import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';

export interface DeviceIdentity {
  deviceId: string;
  name: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

function getIdentityPath(): string {
  return path.join(app.getPath('userData'), 'taskflow-device-identity.json');
}

export function generateDeviceIdentity(name: string): DeviceIdentity {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const identity: DeviceIdentity = {
    deviceId: getDeviceFingerprint(publicKey),
    name,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
  saveDeviceIdentity(identity);
  return identity;
}

export function saveDeviceIdentity(identity: DeviceIdentity, filePath?: string): void {
  const targetPath = filePath ?? getIdentityPath();
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage is not available; refusing to write plaintext device identity');
  }

  const payload = {
    deviceId: identity.deviceId,
    name: identity.name,
    publicKeyPem: identity.publicKeyPem,
    privateKeyPem: safeStorage.encryptString(identity.privateKeyPem).toString('base64'),
    encrypted: true,
  };
  fs.writeFileSync(targetPath, JSON.stringify(payload), { mode: 0o600 });
}

export function loadDeviceIdentity(filePath?: string): DeviceIdentity | null {
  const targetPath = filePath ?? getIdentityPath();
  if (!fs.existsSync(targetPath)) return null;

  let raw: {
    encrypted?: boolean;
    deviceId?: string;
    name?: string;
    publicKeyPem?: string;
    privateKeyPem?: string;
  };
  try {
    raw = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch {
    throw new Error(`Corrupt device identity file: ${targetPath}`);
  }

  if (raw.encrypted) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage is not available; cannot decrypt device identity');
    }
    if (
      typeof raw.deviceId !== 'string' ||
      typeof raw.name !== 'string' ||
      typeof raw.publicKeyPem !== 'string' ||
      typeof raw.privateKeyPem !== 'string'
    ) {
      throw new Error(`Corrupt device identity file: ${targetPath}`);
    }
    const privateKeyPem = safeStorage.decryptString(Buffer.from(raw.privateKeyPem, 'base64'));
    return {
      deviceId: raw.deviceId,
      name: raw.name,
      publicKeyPem: raw.publicKeyPem,
      privateKeyPem,
    };
  }

  throw new Error('Plaintext device identity file found; refusing to load');
}

function readAsn1Length(buf: Buffer, offset: number): { length: number; bytesRead: number } {
  let length = buf[offset];
  if ((length & 0x80) === 0) {
    return { length, bytesRead: 1 };
  }
  const numBytes = length & 0x7f;
  length = 0;
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | buf[offset + 1 + i];
  }
  return { length, bytesRead: 1 + numBytes };
}

function extractRawPublicKeyFromSpki(spkiDer: Buffer): Buffer {
  let offset = 0;
  if (spkiDer[offset++] !== 0x30) {
    throw new Error('Invalid SPKI: expected SEQUENCE');
  }
  const { length: outerLength, bytesRead: outerBytes } = readAsn1Length(spkiDer, offset);
  offset += outerBytes;
  const outerEnd = offset + outerLength;

  if (spkiDer[offset++] !== 0x30) {
    throw new Error('Invalid SPKI: expected AlgorithmIdentifier SEQUENCE');
  }
  const { length: algoLength, bytesRead: algoBytes } = readAsn1Length(spkiDer, offset);
  offset += algoBytes + algoLength;

  if (offset >= outerEnd || spkiDer[offset++] !== 0x03) {
    throw new Error('Invalid SPKI: expected BIT STRING');
  }
  const { length: bitStrLength, bytesRead: bitStrBytes } = readAsn1Length(spkiDer, offset);
  offset += bitStrBytes;

  if (spkiDer[offset++] !== 0x00) {
    throw new Error('Invalid SPKI BIT STRING: expected zero unused bits');
  }

  return spkiDer.subarray(offset, offset + bitStrLength - 1);
}

export function getDeviceFingerprint(publicKeyPem: string): string {
  const spkiDer = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }) as Buffer;
  const rawPublicKey = extractRawPublicKeyFromSpki(spkiDer);
  return createHash('sha256').update(rawPublicKey).digest('hex').slice(0, 16);
}

export function signMessage(message: Buffer, privateKeyPem: string): Buffer {
  return sign(null, message, privateKeyPem);
}

export function verifySignature(
  message: Buffer,
  signature: Buffer,
  publicKeyPem: string
): boolean {
  try {
    return verify(null, message, publicKeyPem, signature);
  } catch {
    return false;
  }
}

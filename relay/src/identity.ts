import { createHash, createPublicKey, verify } from 'crypto';

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

export function verifyDeviceSignature(
  message: Buffer,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    return verify(null, message, publicKeyPem, Buffer.from(signatureBase64, 'base64'));
  } catch {
    return false;
  }
}

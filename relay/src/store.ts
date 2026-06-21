import { generateAuthToken, generatePairingCode } from './auth';

export const MAX_FRAME_SIZE = 8 * 1024 * 1024;
export const QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const CODE_TTL_MS = 5 * 60 * 1000;
export const MAX_QUEUE_BYTES_PER_PEER = 64 * 1024 * 1024;
export const MAX_QUEUE_FRAMES_PER_PEER = 10_000;
export const PAIRING_RATE_LIMIT_MS = 10_000;
export const MAX_CODE_ATTEMPTS = 5;

export interface Device {
  deviceId: string;
  publicKey: string;
  registeredAt: number;
}

export interface AuthToken {
  deviceId: string;
  expiresAt: number;
}

export interface PairingCode {
  createdByDeviceId: string;
  expiresAt: number;
  used: boolean;
  attempts: number;
}

export interface QueuedFrame {
  senderDeviceId: string;
  payload: Buffer;
  createdAt: number;
}

export class RelayStore {
  devices = new Map<string, Device>();
  tokens = new Map<string, AuthToken>();
  codes = new Map<string, PairingCode>();
  queues = new Map<string, QueuedFrame[]>();
  lastPairingRequest = new Map<string, number>();

  registerDevice(deviceId: string, publicKey: string): void {
    this.devices.set(deviceId, {
      deviceId,
      publicKey,
      registeredAt: Date.now(),
    });
  }

  getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  createToken(deviceId: string): string {
    const token = generateAuthToken();
    this.tokens.set(token, {
      deviceId,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });
    return token;
  }

  validateToken(token: string): string | undefined {
    const record = this.tokens.get(token);
    if (!record) return undefined;
    if (record.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return undefined;
    }
    return record.deviceId;
  }

  revokeToken(token: string): void {
    this.tokens.delete(token);
  }

  canCreatePairingCode(deviceId: string): boolean {
    const last = this.lastPairingRequest.get(deviceId) ?? 0;
    if (Date.now() - last < PAIRING_RATE_LIMIT_MS) return false;
    for (const code of this.codes.values()) {
      if (code.createdByDeviceId === deviceId && !code.used && code.expiresAt > Date.now()) {
        return false;
      }
    }
    return true;
  }

  createPairingCode(createdByDeviceId: string): string {
    this.lastPairingRequest.set(createdByDeviceId, Date.now());
    const code = generatePairingCode();
    this.codes.set(code, {
      createdByDeviceId,
      expiresAt: Date.now() + CODE_TTL_MS,
      used: false,
      attempts: 0,
    });
    return code;
  }

  consumePairingCode(code: string, _claimantDeviceId: string): string | undefined {
    const record = this.codes.get(code);
    if (!record) return undefined;
    if (record.used || record.expiresAt < Date.now()) {
      this.codes.delete(code);
      return undefined;
    }
    record.attempts += 1;
    if (record.attempts > MAX_CODE_ATTEMPTS) {
      this.codes.delete(code);
      return undefined;
    }
    record.used = true;
    return record.createdByDeviceId;
  }

  enqueueFrame(recipientDeviceId: string, senderDeviceId: string, payload: Buffer): void {
    const key = `${recipientDeviceId}:${senderDeviceId}`;
    const queue = this.queues.get(key) ?? [];
    let queueBytes = queue.reduce((sum, f) => sum + f.payload.length, 0);
    while (
      queue.length > 0 &&
      (queue.length >= MAX_QUEUE_FRAMES_PER_PEER ||
        queueBytes + payload.length > MAX_QUEUE_BYTES_PER_PEER)
    ) {
      const dropped = queue.shift()!;
      queueBytes -= dropped.payload.length;
    }
    queue.push({ senderDeviceId, payload, createdAt: Date.now() });
    this.queues.set(key, queue);
  }

  dequeueFrames(recipientDeviceId: string, senderDeviceId: string): QueuedFrame[] {
    const key = `${recipientDeviceId}:${senderDeviceId}`;
    const queue = this.queues.get(key);
    if (!queue) return [];
    this.queues.delete(key);
    return queue;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [token, record] of this.tokens) {
      if (record.expiresAt < now) this.tokens.delete(token);
    }
    for (const [code, record] of this.codes) {
      if (record.used || record.expiresAt < now) this.codes.delete(code);
    }
    for (const [key, queue] of this.queues) {
      const filtered = queue.filter((f) => now - f.createdAt < QUEUE_TTL_MS);
      if (filtered.length === 0) this.queues.delete(key);
      else this.queues.set(key, filtered);
    }
    for (const [deviceId, lastRequest] of this.lastPairingRequest) {
      if (now - lastRequest > CODE_TTL_MS) {
        this.lastPairingRequest.delete(deviceId);
      }
    }
  }
}

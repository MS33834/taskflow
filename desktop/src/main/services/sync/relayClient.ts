import { sign } from 'crypto';
import { type DeviceIdentity } from './syncIdentity';
import { buildAuthMessage } from './relayAuth';

export interface RelayRegisterResult {
  deviceId: string;
  token: string;
  wsUrl: string;
  pairedDeviceId?: string;
}

export interface RelayPairingCodeResult {
  code: string;
  expiresAt: number;
}

export class RelayClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async registerDevice(identity: DeviceIdentity): Promise<RelayRegisterResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = buildAuthMessage(identity.deviceId, timestamp, 'register');
    const signature = sign(null, message, identity.privateKeyPem).toString('base64');
    const res = await fetch(`${this.baseUrl}/register-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: identity.deviceId,
        publicKey: identity.publicKeyPem,
        timestamp,
        signature,
      }),
    });
    if (!res.ok) {
      throw new Error(`register-device failed: ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<RelayRegisterResult>;
  }

  async createPairingCode(identity: DeviceIdentity, token: string): Promise<RelayPairingCodeResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = buildAuthMessage(identity.deviceId, timestamp, 'pairing-code');
    const signature = sign(null, message, identity.privateKeyPem).toString('base64');
    const res = await fetch(`${this.baseUrl}/pairing-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ timestamp, signature }),
    });
    if (!res.ok) {
      throw new Error(`pairing-codes failed: ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<RelayPairingCodeResult>;
  }

  async claimPairingCode(
    identity: DeviceIdentity,
    code: string
  ): Promise<RelayRegisterResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = buildAuthMessage(identity.deviceId, timestamp, 'claim-pairing-code:' + code);
    const signature = sign(null, message, identity.privateKeyPem).toString('base64');
    const res = await fetch(`${this.baseUrl}/claim-pairing-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        deviceId: identity.deviceId,
        publicKey: identity.publicKeyPem,
        timestamp,
        signature,
      }),
    });
    if (!res.ok) {
      throw new Error(`claim-pairing-code failed: ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<RelayRegisterResult>;
  }
}

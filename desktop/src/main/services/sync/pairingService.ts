import Database from 'better-sqlite3-multiple-ciphers';
import { RelayClient } from './relayClient';
import { type DeviceIdentity } from './syncIdentity';
import { SyncSession } from './syncSession';
import { RelayTransport } from './relayTransport';
import {
  encryptSessionMessage,
  decryptSessionMessage,
  loadSyncMasterKey,
  saveSyncMasterKey,
} from './syncCrypto';
import { registerSyncDevice, type SyncDevice } from './syncStorage';
import { SmkTransferMessage } from './syncMessages';

export interface PairingCodeResult {
  code: string;
  expiresAt: number;
}

export interface TokenStorage {
  get: () => string | undefined;
  set: (value: string) => void;
}

export interface PairingResult {
  peerDeviceId: string;
}

export interface PairingOptions {
  db?: Database.Database;
  smkPath?: string;
}

const PAIRING_TIMEOUT_MS = 120_000;

export async function generatePairingCode(
  relayUrl: string,
  identity: DeviceIdentity,
  tokenStorage: TokenStorage
): Promise<PairingCodeResult> {
  const client = new RelayClient(relayUrl);
  let token = tokenStorage.get();
  if (!token) {
    const result = await client.registerDevice(identity);
    token = result.token;
    tokenStorage.set(token);
  }
  return client.createPairingCode(identity, token);
}

export function respondToPairing(
  wsUrl: string,
  token: string,
  pairingCode: string,
  identity: DeviceIdentity,
  options?: PairingOptions
): Promise<PairingResult> {
  return new Promise((resolve, reject) => {
    const transport = new RelayTransport({
      url: appendPairingCodeToUrl(wsUrl, pairingCode),
      token,
      role: 'responder',
      createSession: () =>
        new SyncSession({
          identity,
          isInitiator: false,
          isPairing: true,
          getTrustedPublicKey: () => undefined,
        }),
      onSession: (session) => {
        const finish = createFinisher(resolve, reject, transport, timeout);
        session.once('ready', () => {
          try {
            const smk = loadSmk(options?.smkPath);
            if (!smk) {
              throw new Error('sync master key not found');
            }
            const sendKey = session.getSendKey();
            if (!sendKey) {
              throw new Error('session keys not ready');
            }
            const encrypted = encryptSessionMessage(smk, sendKey);
            const msg: SmkTransferMessage = {
              type: 'SMK_TRANSFER',
              encryptedSmk: encrypted.toString('base64'),
            };
            session.send(msg);

            const peer = session.getPeerIdentity();
            if (!peer) {
              throw new Error('missing peer identity');
            }
            registerDevice(
              {
                deviceId: peer.deviceId,
                publicKey: peer.publicKey,
                name: `Device-${peer.deviceId.slice(0, 4)}`,
                pairedAt: Date.now(),
              },
              options?.db
            );

            finish({ peerDeviceId: peer.deviceId }, undefined);
          } catch (err) {
            finish(undefined, err);
          }
        });
      },
    });

    const timeout = setTimeout(() => {
      createFinisher(resolve, reject, transport, timeout)(undefined, new Error('pairing response timed out'));
    }, PAIRING_TIMEOUT_MS);
  });
}

export async function claimPairingCodeAndPair(
  relayUrl: string,
  identity: DeviceIdentity,
  code: string,
  tokenStorage: TokenStorage,
  options?: PairingOptions
): Promise<PairingResult> {
  const client = new RelayClient(relayUrl);
  const claim = await client.claimPairingCode(identity, code);
  const token = claim.token;
  tokenStorage.set(token);

  const pairedDeviceId = claim.pairedDeviceId;
  if (!pairedDeviceId) {
    throw new Error('claim response missing paired device id');
  }

  return new Promise((resolve, reject) => {
    const transport = new RelayTransport({
      url: appendPairingParamsToUrl(claim.wsUrl, code, pairedDeviceId),
      token,
      role: 'initiator',
      createSession: () =>
        new SyncSession({
          identity,
          isInitiator: true,
          isPairing: true,
          getTrustedPublicKey: () => undefined,
        }),
      onSession: (session) => {
        const finish = createFinisher(resolve, reject, transport, timeout);
        session.on('message', (msg) => {
          if (msg.type !== 'SMK_TRANSFER') return;
          try {
            const receiveKey = session.getReceiveKey();
            if (!receiveKey) {
              throw new Error('session keys not ready');
            }
            const smk = decryptSessionMessage(Buffer.from(msg.encryptedSmk, 'base64'), receiveKey);
            saveSmk(smk, options?.smkPath);

            const peer = session.getPeerIdentity();
            if (!peer) {
              throw new Error('missing peer identity');
            }
            registerDevice(
              {
                deviceId: peer.deviceId,
                publicKey: peer.publicKey,
                name: `Device-${peer.deviceId.slice(0, 4)}`,
                pairedAt: Date.now(),
              },
              options?.db
            );

            finish({ peerDeviceId: peer.deviceId }, undefined);
          } catch (err) {
            finish(undefined, err);
          }
        });
      },
    });

    const timeout = setTimeout(() => {
      createFinisher(resolve, reject, transport, timeout)(undefined, new Error('pairing claim timed out'));
    }, PAIRING_TIMEOUT_MS);
  });
}

function createFinisher(
  resolve: (value: PairingResult) => void,
  reject: (reason: unknown) => void,
  transport: RelayTransport,
  timeout?: NodeJS.Timeout
): (result: PairingResult | undefined, error: unknown) => void {
  let resolved = false;
  return (result, error) => {
    if (resolved) return;
    resolved = true;
    if (timeout) clearTimeout(timeout);
    transport.destroy();
    if (result !== undefined) {
      resolve(result);
    } else {
      reject(error);
    }
  };
}

function loadSmk(smkPath?: string): Buffer | null {
  return smkPath ? loadSyncMasterKey(smkPath) : loadSyncMasterKey();
}

function saveSmk(smk: Buffer, smkPath?: string): void {
  if (smkPath) {
    saveSyncMasterKey(smk, smkPath);
  } else {
    saveSyncMasterKey(smk);
  }
}

function registerDevice(device: Omit<SyncDevice, 'lastSeenAt'> & { lastSeenAt?: number }, db?: Database.Database): void {
  if (db) {
    registerSyncDevice(device, db);
  } else {
    registerSyncDevice(device);
  }
}

function appendPairingCodeToUrl(wsUrl: string, pairingCode: string): string {
  const separator = wsUrl.includes('?') ? '&' : '?';
  return `${wsUrl}${separator}pairingCode=${encodeURIComponent(pairingCode)}`;
}

function appendPairingParamsToUrl(wsUrl: string, pairingCode: string, targetDeviceId: string): string {
  const separator = wsUrl.includes('?') ? '&' : '?';
  return `${wsUrl}${separator}pairingCode=${encodeURIComponent(pairingCode)}&target=${encodeURIComponent(targetDeviceId)}`;
}

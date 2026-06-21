import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';
import {
  DeviceIdentity,
  signMessage,
  verifySignature,
  getDeviceFingerprint,
} from './syncIdentity';
import {
  generateEcdhKeyPair,
  computeSharedSecret,
  deriveSessionKeys,
  encryptSessionMessage,
  decryptSessionMessage,
  EcdhKeyPair,
} from './syncCrypto';
import {
  SyncMessage,
  HelloMessage,
  OfferMessage,
  AnswerMessage,
  serializeMessage,
  deserializeMessage,
  FrameMode,
} from './syncMessages';

export interface SyncSessionOptions {
  identity: DeviceIdentity;
  isInitiator: boolean;
  getTrustedPublicKey: (deviceId: string) => string | undefined;
}

type SessionState =
  | 'idle'
  | 'hello_sent'
  | 'hello_received'
  | 'offered'
  | 'ready'
  | 'closed';

export class SyncSession extends EventEmitter {
  private identity: DeviceIdentity;
  private isInitiator: boolean;
  private getTrustedPublicKey: (deviceId: string) => string | undefined;
  private state: SessionState = 'idle';
  private nonce: string;
  private peerDeviceId: string | null = null;
  private peerPublicKey: string | null = null;
  private peerNonce: string | null = null;
  private ecdhKeyPair: EcdhKeyPair | null = null;
  private sendKey: Buffer | null = null;
  private receiveKey: Buffer | null = null;

  constructor(opts: SyncSessionOptions) {
    super();
    this.identity = opts.identity;
    this.isInitiator = opts.isInitiator;
    this.getTrustedPublicKey = opts.getTrustedPublicKey;
    this.nonce = randomBytes(16).toString('base64');
  }

  getNonce(): string {
    return this.nonce;
  }

  isReady(): boolean {
    return this.state === 'ready';
  }

  begin(): void {
    if (!this.isInitiator) {
      throw new Error('Only the initiator can begin the handshake');
    }
    if (this.state !== 'idle') {
      throw new Error('Handshake already started');
    }
    this.state = 'hello_sent';
    this.emitHandshake(this.createHello());
  }

  feedRawFrame(mode: FrameMode, payload: Buffer): void {
    if (this.state === 'closed') return;
    try {
      if (mode === 0) {
        this.handleHandshakeMessage(deserializeMessage(payload));
      } else {
        this.handleEncryptedFrame(payload);
      }
    } catch (err) {
      this.emit('error', err);
    }
  }

  send(msg: SyncMessage): void {
    if (this.state !== 'ready' || !this.sendKey) {
      throw new Error('Session is not ready');
    }
    const plaintext = serializeMessage(msg);
    const encrypted = encryptSessionMessage(plaintext, this.sendKey);
    this.emit('sendFrame', 1 as FrameMode, encrypted);
  }

  close(): void {
    this.state = 'closed';
    this.emit('close');
  }

  private createHello(): HelloMessage {
    return {
      type: 'HELLO',
      deviceId: this.identity.deviceId,
      publicKey: this.identity.publicKeyPem,
      nonce: this.nonce,
    };
  }

  private emitHandshake(msg: SyncMessage): void {
    this.emit('sendFrame', 0 as FrameMode, serializeMessage(msg));
  }

  private handleHandshakeMessage(msg: SyncMessage): void {
    switch (msg.type) {
      case 'HELLO':
        this.handleHello(msg);
        break;
      case 'OFFER':
        this.handleOffer(msg);
        break;
      case 'ANSWER':
        this.handleAnswer(msg);
        break;
      default:
        throw new Error(`Unexpected handshake message ${msg.type}`);
    }
  }

  private handleHello(msg: HelloMessage): void {
    const trustedKey = this.getTrustedPublicKey(msg.deviceId);
    if (!trustedKey) {
      throw new Error(`Unknown device ${msg.deviceId}`);
    }
    if (trustedKey !== msg.publicKey) {
      throw new Error(`Public key mismatch for ${msg.deviceId}`);
    }
    if (getDeviceFingerprint(msg.publicKey) !== msg.deviceId) {
      throw new Error('DeviceId does not match public key fingerprint');
    }

    this.peerDeviceId = msg.deviceId;
    this.peerPublicKey = msg.publicKey;
    this.peerNonce = msg.nonce;

    if (this.isInitiator) {
      if (this.state !== 'hello_sent') {
        throw new Error('Unexpected HELLO');
      }
      this.sendOffer();
    } else {
      if (this.state !== 'idle') {
        throw new Error('Unexpected HELLO');
      }
      this.state = 'hello_received';
      this.emitHandshake(this.createHello());
    }
  }

  private sendOffer(): void {
    if (this.state !== 'hello_sent' && this.state !== 'hello_received') {
      throw new Error('Cannot send OFFER in current state');
    }
    this.ecdhKeyPair = generateEcdhKeyPair();
    const signature = this.signEcdhKey(this.ecdhKeyPair.publicKeyPem);
    const payload = {
      ecdhPublicKeyPem: this.ecdhKeyPair.publicKeyPem,
      signature: signature.toString('base64'),
    };
    const offer: OfferMessage = {
      type: 'OFFER',
      encryptedPayload: Buffer.from(JSON.stringify(payload)).toString('base64'),
    };
    this.state = 'offered';
    this.emitHandshake(offer);
  }

  private handleOffer(msg: OfferMessage): void {
    if (this.isInitiator) {
      throw new Error('Initiator received unexpected OFFER');
    }
    if (this.state !== 'hello_received') {
      throw new Error('Unexpected OFFER');
    }
    if (!this.peerDeviceId || !this.peerNonce) {
      throw new Error('Peer identity not established');
    }

    const peerEcdhPublic = this.verifyAndExtractEcdhKey(msg.encryptedPayload);
    this.ecdhKeyPair = generateEcdhKeyPair();
    this.computeSessionKeys(peerEcdhPublic, 'responder');

    const signature = this.signEcdhKey(this.ecdhKeyPair.publicKeyPem);
    const payload = {
      ecdhPublicKeyPem: this.ecdhKeyPair.publicKeyPem,
      signature: signature.toString('base64'),
    };
    const answer: AnswerMessage = {
      type: 'ANSWER',
      encryptedPayload: Buffer.from(JSON.stringify(payload)).toString('base64'),
    };
    this.state = 'ready';
    this.emitHandshake(answer);
    this.emit('ready');
  }

  private handleAnswer(msg: AnswerMessage): void {
    if (!this.isInitiator) {
      throw new Error('Responder received unexpected ANSWER');
    }
    if (this.state !== 'offered') {
      throw new Error('Unexpected ANSWER');
    }
    if (!this.peerDeviceId || !this.peerNonce) {
      throw new Error('Peer identity not established');
    }

    const peerEcdhPublic = this.verifyAndExtractEcdhKey(msg.encryptedPayload);
    this.computeSessionKeys(peerEcdhPublic, 'initiator');
    this.state = 'ready';
    this.emit('ready');
  }

  private signEcdhKey(ecdhPublicKeyPem: string): Buffer {
    if (!this.peerDeviceId || !this.peerNonce) {
      throw new Error('Peer identity not established');
    }
    const message = buildSignedData(
      this.identity.deviceId,
      this.peerDeviceId,
      this.nonce,
      this.peerNonce,
      ecdhPublicKeyPem
    );
    return signMessage(message, this.identity.privateKeyPem);
  }

  private verifyAndExtractEcdhKey(encryptedPayload: string): string {
    if (!this.peerDeviceId || !this.peerNonce || !this.peerPublicKey) {
      throw new Error('Peer identity not established');
    }
    const payload = JSON.parse(Buffer.from(encryptedPayload, 'base64').toString('utf8'));
    if (!payload.ecdhPublicKeyPem || !payload.signature) {
      throw new Error('Invalid OFFER/ANSWER payload');
    }

    const message = buildSignedData(
      this.peerDeviceId,
      this.identity.deviceId,
      this.peerNonce,
      this.nonce,
      payload.ecdhPublicKeyPem
    );
    const signature = Buffer.from(payload.signature, 'base64');
    const valid = verifySignature(message, signature, this.peerPublicKey);
    if (!valid) {
      throw new Error('Invalid ECDH key signature');
    }
    return payload.ecdhPublicKeyPem;
  }

  private computeSessionKeys(peerEcdhPublicKeyPem: string, role: 'initiator' | 'responder'): void {
    if (!this.ecdhKeyPair || !this.peerDeviceId) {
      throw new Error('Cannot compute session keys');
    }
    const sharedSecret = computeSharedSecret(
      this.ecdhKeyPair.privateKeyPem,
      peerEcdhPublicKeyPem
    );
    const sortedDeviceIds = [this.identity.deviceId, this.peerDeviceId].sort();
    const sortedNonces = [this.nonce, this.peerNonce!].sort();
    const salt = createHash('sha256')
      .update(
        Buffer.concat([
          Buffer.from(sortedDeviceIds[0], 'utf8'),
          Buffer.from(sortedDeviceIds[1], 'utf8'),
          Buffer.from(sortedNonces[0], 'utf8'),
          Buffer.from(sortedNonces[1], 'utf8'),
        ])
      )
      .digest();
    const keys = deriveSessionKeys(sharedSecret, salt, role);
    this.sendKey = keys.sendKey;
    this.receiveKey = keys.receiveKey;
  }

  private handleEncryptedFrame(payload: Buffer): void {
    if (!this.receiveKey) {
      throw new Error('Received encrypted frame before key negotiation');
    }
    const plaintext = decryptSessionMessage(payload, this.receiveKey);
    const msg = deserializeMessage(plaintext);
    this.emit('message', msg);
  }
}

function buildSignedData(
  deviceId: string,
  peerDeviceId: string,
  nonce: string,
  peerNonce: string,
  ecdhPublicKeyPem: string
): Buffer {
  return Buffer.concat([
    Buffer.from(deviceId, 'utf8'),
    Buffer.from(peerDeviceId, 'utf8'),
    Buffer.from(nonce, 'utf8'),
    Buffer.from(peerNonce, 'utf8'),
    Buffer.from(ecdhPublicKeyPem, 'utf8'),
  ]);
}

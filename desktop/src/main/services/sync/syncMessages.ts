import { EventEmitter } from 'events';

export interface HelloMessage {
  type: 'HELLO';
  deviceId: string;
  publicKey: string;
  nonce: string;
}

export interface OfferMessage {
  type: 'OFFER';
  encryptedPayload: string;
}

export interface AnswerMessage {
  type: 'ANSWER';
  encryptedPayload: string;
}

export interface ManifestRecordItem {
  id: string;
  updatedAt: number;
  hash: string;
}

export interface ManifestMessage {
  type: 'MANIFEST';
  records: ManifestRecordItem[];
}

export interface RequestMessage {
  type: 'REQUEST';
  recordIds: string[];
}

export interface WireSyncRecord {
  id: string;
  tableName: string;
  recordId: string;
  version: number;
  encryptedPayload: string;
  updatedAt: number;
  deleted: number;
}

export interface BatchMessage {
  type: 'BATCH';
  records: WireSyncRecord[];
}

export interface AckMessage {
  type: 'ACK';
  receivedIds: string[];
}

export interface ErrorMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

export type SyncMessage =
  | HelloMessage
  | OfferMessage
  | AnswerMessage
  | ManifestMessage
  | RequestMessage
  | BatchMessage
  | AckMessage
  | ErrorMessage;

const MESSAGE_TYPES = [
  'HELLO',
  'OFFER',
  'ANSWER',
  'MANIFEST',
  'REQUEST',
  'BATCH',
  'ACK',
  'ERROR',
];

export function isSyncMessage(obj: unknown): obj is SyncMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    typeof (obj as { type: unknown }).type === 'string' &&
    MESSAGE_TYPES.includes((obj as { type: string }).type)
  );
}

export function serializeMessage(msg: SyncMessage): Buffer {
  return Buffer.from(JSON.stringify(msg), 'utf8');
}

export function deserializeMessage(buf: Buffer): SyncMessage {
  const obj = JSON.parse(buf.toString('utf8'));
  if (!isSyncMessage(obj)) {
    throw new Error(`Invalid sync message: ${JSON.stringify(obj)}`);
  }
  return obj;
}

export type FrameMode = 0 | 1;

export interface ParsedFrame {
  mode: FrameMode;
  payload: Buffer;
}

export class FrameParser extends EventEmitter {
  private buffer = Buffer.alloc(0);

  feed(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      if (this.buffer.length < 5) return;

      const mode = this.buffer[0] as FrameMode;
      if (mode !== 0 && mode !== 1) {
        this.emit('error', new Error(`Invalid frame mode ${mode}`));
        return;
      }

      const length = this.buffer.readUInt32BE(1);
      if (this.buffer.length < 5 + length) return;

      const payload = this.buffer.subarray(5, 5 + length);
      this.buffer = this.buffer.subarray(5 + length);
      this.emit('frame', { mode, payload } as ParsedFrame);
    }
  }
}

export function encodeFrame(mode: FrameMode, payload: Buffer): Buffer {
  const frame = Buffer.allocUnsafe(5 + payload.length);
  frame[0] = mode;
  frame.writeUInt32BE(payload.length, 1);
  payload.copy(frame, 5);
  return frame;
}

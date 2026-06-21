import { EventEmitter } from 'events';

export interface HelloMessage {
  type: 'HELLO';
  deviceId: string;
  publicKey: string;
  nonce: string;
}

export interface OfferMessage {
  type: 'OFFER';
  signedPayload: string;
}

export interface AnswerMessage {
  type: 'ANSWER';
  signedPayload: string;
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

export function isHelloMessage(msg: unknown): msg is HelloMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as HelloMessage).type === 'HELLO' &&
    typeof (msg as HelloMessage).deviceId === 'string' &&
    typeof (msg as HelloMessage).publicKey === 'string' &&
    typeof (msg as HelloMessage).nonce === 'string'
  );
}

export function isOfferMessage(msg: unknown): msg is OfferMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as OfferMessage).type === 'OFFER' &&
    typeof (msg as OfferMessage).signedPayload === 'string'
  );
}

export function isAnswerMessage(msg: unknown): msg is AnswerMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as AnswerMessage).type === 'ANSWER' &&
    typeof (msg as AnswerMessage).signedPayload === 'string'
  );
}

export function isManifestRecordItem(item: unknown): item is ManifestRecordItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as ManifestRecordItem).id === 'string' &&
    typeof (item as ManifestRecordItem).updatedAt === 'number' &&
    typeof (item as ManifestRecordItem).hash === 'string'
  );
}

export function isManifestMessage(msg: unknown): msg is ManifestMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as ManifestMessage).type === 'MANIFEST' &&
    Array.isArray((msg as ManifestMessage).records) &&
    (msg as ManifestMessage).records.every(isManifestRecordItem)
  );
}

export function isRequestMessage(msg: unknown): msg is RequestMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as RequestMessage).type === 'REQUEST' &&
    Array.isArray((msg as RequestMessage).recordIds) &&
    (msg as RequestMessage).recordIds.every((id) => typeof id === 'string')
  );
}

export function isWireSyncRecord(record: unknown): record is WireSyncRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    typeof (record as WireSyncRecord).id === 'string' &&
    typeof (record as WireSyncRecord).tableName === 'string' &&
    typeof (record as WireSyncRecord).recordId === 'string' &&
    typeof (record as WireSyncRecord).version === 'number' &&
    typeof (record as WireSyncRecord).encryptedPayload === 'string' &&
    typeof (record as WireSyncRecord).updatedAt === 'number' &&
    typeof (record as WireSyncRecord).deleted === 'number'
  );
}

export function isBatchMessage(msg: unknown): msg is BatchMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as BatchMessage).type === 'BATCH' &&
    Array.isArray((msg as BatchMessage).records) &&
    (msg as BatchMessage).records.every(isWireSyncRecord)
  );
}

export function isAckMessage(msg: unknown): msg is AckMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as AckMessage).type === 'ACK' &&
    Array.isArray((msg as AckMessage).receivedIds) &&
    (msg as AckMessage).receivedIds.every((id) => typeof id === 'string')
  );
}

export function isErrorMessage(msg: unknown): msg is ErrorMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as ErrorMessage).type === 'ERROR' &&
    typeof (msg as ErrorMessage).code === 'string' &&
    typeof (msg as ErrorMessage).message === 'string'
  );
}

export function isSyncMessage(obj: unknown): obj is SyncMessage {
  if (
    !(
      typeof obj === 'object' &&
      obj !== null &&
      'type' in obj &&
      typeof (obj as { type: unknown }).type === 'string' &&
      MESSAGE_TYPES.includes((obj as { type: string }).type)
    )
  ) {
    return false;
  }
  switch ((obj as { type: string }).type) {
    case 'HELLO':
      return isHelloMessage(obj);
    case 'OFFER':
      return isOfferMessage(obj);
    case 'ANSWER':
      return isAnswerMessage(obj);
    case 'MANIFEST':
      return isManifestMessage(obj);
    case 'REQUEST':
      return isRequestMessage(obj);
    case 'BATCH':
      return isBatchMessage(obj);
    case 'ACK':
      return isAckMessage(obj);
    case 'ERROR':
      return isErrorMessage(obj);
    default:
      return false;
  }
}

export function serializeMessage(msg: SyncMessage): Buffer {
  return Buffer.from(JSON.stringify(msg), 'utf8');
}

export function deserializeMessage(buf: Buffer): SyncMessage {
  let obj: unknown;
  try {
    obj = JSON.parse(buf.toString('utf8'));
  } catch {
    throw new Error('Malformed sync message: invalid JSON');
  }
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

export const MAX_FRAME_SIZE = 8 * 1024 * 1024;

export class FrameParser extends EventEmitter {
  private buffer = Buffer.alloc(0);

  feed(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      if (this.buffer.length < 5) return;

      const mode = this.buffer[0] as FrameMode;
      if (mode !== 0 && mode !== 1) {
        this.emit('error', new Error(`Invalid frame mode ${mode}`));
        this.buffer = Buffer.alloc(0);
        return;
      }

      const length = this.buffer.readUInt32BE(1);
      if (length > MAX_FRAME_SIZE) {
        this.emit('error', new Error(`Frame exceeds maximum size of ${MAX_FRAME_SIZE} bytes`));
        this.buffer = Buffer.alloc(0);
        return;
      }

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

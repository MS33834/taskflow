import { describe, it, expect, vi } from 'vitest';
import {
  serializeMessage,
  deserializeMessage,
  encodeFrame,
  FrameParser,
  WireSyncRecord,
  MAX_FRAME_SIZE,
  isHelloMessage,
  isOfferMessage,
  isBatchMessage,
  isSmkTransferMessage,
} from '../../../main/services/sync/syncMessages';

describe('syncMessages', () => {
  it('round-trips a HELLO message', () => {
    const msg = {
      type: 'HELLO' as const,
      deviceId: 'dev1',
      publicKey: '-----BEGIN PUBLIC KEY-----',
      nonce: 'nonce-1',
    };
    const recovered = deserializeMessage(serializeMessage(msg));
    expect(recovered).toEqual(msg);
  });

  it('round-trips a BATCH message with base64 payloads', () => {
    const record: WireSyncRecord = {
      id: 'tasks:1:v1',
      tableName: 'tasks',
      recordId: '1',
      version: 1,
      encryptedPayload: Buffer.from('secret-payload').toString('base64'),
      updatedAt: 1000,
      deleted: 0,
    };
    const msg = { type: 'BATCH' as const, records: [record] };
    const recovered = deserializeMessage(serializeMessage(msg));
    expect(recovered).toEqual(msg);
  });

  it('rejects an invalid message type', () => {
    const buf = Buffer.from(JSON.stringify({ type: 'UNKNOWN' }), 'utf8');
    expect(() => deserializeMessage(buf)).toThrow('Invalid sync message');
  });

  it('parses concatenated length-prefixed frames', () => {
    const parser = new FrameParser();
    const frames: Array<{ mode: number; payload: string }> = [];
    parser.on('frame', (frame) =>
      frames.push({ mode: frame.mode, payload: frame.payload.toString('utf8') })
    );

    const data = Buffer.concat([
      encodeFrame(0, Buffer.from('hello')),
      encodeFrame(1, Buffer.from('world')),
    ]);
    parser.feed(data);

    expect(frames).toHaveLength(2);
    expect(frames[0].mode).toBe(0);
    expect(frames[0].payload).toBe('hello');
    expect(frames[1].mode).toBe(1);
    expect(frames[1].payload).toBe('world');
  });

  it('emits an error and clears the buffer for oversized frames', () => {
    const parser = new FrameParser();
    const errorHandler = vi.fn();
    parser.on('error', errorHandler);

    const oversized = Buffer.allocUnsafe(5 + MAX_FRAME_SIZE + 1);
    oversized[0] = 0;
    oversized.writeUInt32BE(MAX_FRAME_SIZE + 1, 1);
    parser.feed(oversized);

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler.mock.calls[0][0].message).toContain('maximum size');
  });

  it('rejects malformed JSON', () => {
    expect(() => deserializeMessage(Buffer.from('not json', 'utf8'))).toThrow('invalid JSON');
  });

  it('rejects messages with missing required fields', () => {
    const buf = Buffer.from(JSON.stringify({ type: 'HELLO', deviceId: 'x' }), 'utf8');
    expect(() => deserializeMessage(buf)).toThrow('Invalid sync message');
  });

  it('rejects messages with invalid field types', () => {
    const buf = Buffer.from(
      JSON.stringify({ type: 'REQUEST', recordIds: [1, 2] }),
      'utf8'
    );
    expect(() => deserializeMessage(buf)).toThrow('Invalid sync message');
  });

  it('round-trips an SMK_TRANSFER message', () => {
    const msg = {
      type: 'SMK_TRANSFER' as const,
      encryptedSmk: Buffer.from('encrypted-key').toString('base64'),
    };
    const recovered = deserializeMessage(serializeMessage(msg));
    expect(recovered).toEqual(msg);
  });

  it('validates message shape with type guards', () => {
    expect(isHelloMessage({ type: 'HELLO', deviceId: 'a', publicKey: 'b', nonce: 'c' })).toBe(true);
    expect(isHelloMessage({ type: 'HELLO', deviceId: 'a' })).toBe(false);
    expect(isOfferMessage({ type: 'OFFER', signedPayload: 'payload' })).toBe(true);
    expect(isOfferMessage({ type: 'OFFER', encryptedPayload: 'payload' })).toBe(false);
    expect(isBatchMessage({ type: 'BATCH', records: [] })).toBe(true);
    expect(isSmkTransferMessage({ type: 'SMK_TRANSFER', encryptedSmk: 'payload' })).toBe(true);
    expect(isSmkTransferMessage({ type: 'SMK_TRANSFER' })).toBe(false);
    expect(isSmkTransferMessage({ type: 'UNKNOWN', encryptedSmk: 'payload' })).toBe(false);
  });
});

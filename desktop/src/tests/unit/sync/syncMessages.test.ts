import { describe, it, expect } from 'vitest';
import {
  serializeMessage,
  deserializeMessage,
  encodeFrame,
  FrameParser,
  WireSyncRecord,
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
});

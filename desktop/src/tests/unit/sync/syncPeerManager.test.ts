import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { SyncPeerManager } from '../../../main/services/sync/syncPeerManager';
import type { SyncPeer } from '../../../main/services/sync/syncPeer';

function createMockPeer(deviceId: string): SyncPeer {
  const session = new EventEmitter();
  const engine = new EventEmitter();
  (session as unknown as { close: () => void }).close = () => {
    session.emit('close');
  };
  return {
    deviceId,
    session: session as unknown as SyncPeer['session'],
    engine: engine as unknown as SyncPeer['engine'],
    state: 'idle',
    lastSyncAt: null,
    error: null,
  };
}

describe('SyncPeerManager', () => {
  it('adds a peer and emits stateChanged', () => {
    const manager = new SyncPeerManager();
    const listener = vi.fn();
    manager.on('stateChanged', listener);

    const peer = createMockPeer('device-a');
    manager.addPeer(peer);

    expect(listener).toHaveBeenCalledWith({
      peers: [
        {
          deviceId: 'device-a',
          state: 'idle',
          lastSyncAt: null,
          error: null,
        },
      ],
    });
    expect(manager.getPeer('device-a')).toBe(peer);
  });

  it('removes a peer and emits stateChanged', () => {
    const manager = new SyncPeerManager();
    const peer = createMockPeer('device-a');
    manager.addPeer(peer);

    const listener = vi.fn();
    manager.on('stateChanged', listener);
    manager.removePeer('device-a');

    expect(manager.getPeer('device-a')).toBeUndefined();
    expect(listener).toHaveBeenCalledWith({ peers: [] });
  });

  it('replaces an existing peer with the same deviceId', () => {
    const manager = new SyncPeerManager();
    const peer1 = createMockPeer('device-a');
    const peer2 = createMockPeer('device-a');

    manager.addPeer(peer1);
    manager.addPeer(peer2);

    expect(manager.getPeer('device-a')).toBe(peer2);
    expect(manager.getPeers()).toHaveLength(1);
  });

  it('reflects engine complete as idle with lastSyncAt', () => {
    const manager = new SyncPeerManager();
    const peer = createMockPeer('device-a');
    manager.addPeer(peer);

    const before = Date.now();
    peer.engine.emit('complete');
    const after = Date.now();

    expect(peer.state).toBe('idle');
    expect(peer.lastSyncAt).toBeGreaterThanOrEqual(before);
    expect(peer.lastSyncAt).toBeLessThanOrEqual(after);
  });

  it('reflects engine error as error state', () => {
    const manager = new SyncPeerManager();
    const peer = createMockPeer('device-a');
    manager.addPeer(peer);

    peer.engine.emit('error', new Error('sync failed'));

    expect(peer.state).toBe('error');
    expect(peer.error).toBe('sync failed');
  });

  it('removes peer when session closes', () => {
    const manager = new SyncPeerManager();
    const peer = createMockPeer('device-a');
    manager.addPeer(peer);

    peer.session.emit('close');

    expect(manager.getPeer('device-a')).toBeUndefined();
  });
});

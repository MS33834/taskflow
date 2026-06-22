import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { SyncPeerManager } from '../../../main/services/sync/syncPeerManager';
import type { SyncPeer } from '../../../main/services/sync/syncPeer';

function createMockPeer(deviceId: string): SyncPeer & { triggerSync: ReturnType<typeof vi.fn> } {
  const session = new EventEmitter();
  const engine = new EventEmitter();
  const triggerSync = vi.fn();
  return {
    deviceId,
    session: session as unknown as SyncPeer['session'],
    engine: Object.assign(engine, { triggerSync }) as unknown as SyncPeer['engine'],
    state: 'idle',
    lastSyncAt: null,
    error: null,
    triggerSync,
  };
}

describe('SyncPeerManager broadcast', () => {
  it('broadcasts local changes to all idle peers', () => {
    const manager = new SyncPeerManager();
    const peerA = createMockPeer('device-a');
    const peerB = createMockPeer('device-b');
    manager.addPeer(peerA);
    manager.addPeer(peerB);

    manager.broadcastLocalChange();

    expect(peerA.triggerSync).toHaveBeenCalledTimes(1);
    expect(peerB.triggerSync).toHaveBeenCalledTimes(1);
    expect(peerA.state).toBe('syncing');
    expect(peerB.state).toBe('syncing');
  });

  it('skips peers in error or closed state', () => {
    const manager = new SyncPeerManager();
    const peerA = createMockPeer('device-a');
    const peerB = createMockPeer('device-b');
    peerB.state = 'error';
    manager.addPeer(peerA);
    manager.addPeer(peerB);

    manager.broadcastLocalChange();

    expect(peerA.triggerSync).toHaveBeenCalledTimes(1);
    expect(peerB.triggerSync).not.toHaveBeenCalled();
  });

  it('emits stateChanged after broadcasting', () => {
    const manager = new SyncPeerManager();
    const peer = createMockPeer('device-a');
    manager.addPeer(peer);

    const listener = vi.fn();
    manager.on('stateChanged', listener);
    manager.broadcastLocalChange();

    expect(listener).toHaveBeenCalledWith({
      peers: [
        {
          deviceId: 'device-a',
          state: 'syncing',
          lastSyncAt: null,
          error: null,
        },
      ],
    });
  });
});

import { EventEmitter } from 'events';
import { SyncPeer, PeerState } from './syncPeer';

export interface PeerManagerState {
  peers: Array<{
    deviceId: string;
    state: PeerState;
    lastSyncAt: number | null;
    error: string | null;
  }>;
}

export class SyncPeerManager extends EventEmitter {
  private peers = new Map<string, SyncPeer>();

  addPeer(peer: SyncPeer): void {
    if (this.peers.has(peer.deviceId)) {
      this.removePeer(peer.deviceId);
    }
    this.peers.set(peer.deviceId, peer);
    this.bindPeerEvents(peer);
    this.emit('stateChanged', this.getState());
  }

  removePeer(deviceId: string): void {
    const peer = this.peers.get(deviceId);
    if (!peer) return;
    peer.session.removeAllListeners();
    peer.engine.removeAllListeners();
    peer.state = 'closed';
    this.peers.delete(deviceId);
    this.emit('stateChanged', this.getState());
  }

  getPeer(deviceId: string): SyncPeer | undefined {
    return this.peers.get(deviceId);
  }

  getPeers(): SyncPeer[] {
    return Array.from(this.peers.values());
  }

  getState(): PeerManagerState {
    return {
      peers: this.getPeers().map((p) => ({
        deviceId: p.deviceId,
        state: p.state,
        lastSyncAt: p.lastSyncAt,
        error: p.error,
      })),
    };
  }

  broadcastLocalChange(): void {
    for (const peer of this.getPeers()) {
      if (peer.state === 'idle' || peer.state === 'syncing') {
        peer.state = 'syncing';
        peer.engine.triggerSync();
      }
    }
    this.emit('stateChanged', this.getState());
  }

  private bindPeerEvents(peer: SyncPeer): void {
    peer.engine.on('complete', () => {
      peer.state = 'idle';
      peer.lastSyncAt = Date.now();
      this.emit('peerSyncComplete', peer.deviceId);
      this.emit('stateChanged', this.getState());
    });
    peer.engine.on('error', (err: Error) => {
      peer.state = 'error';
      peer.error = err.message;
      this.emit('stateChanged', this.getState());
    });
    peer.session.on('close', () => {
      this.removePeer(peer.deviceId);
    });
  }
}

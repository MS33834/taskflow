import { SyncSession } from './syncSession';
import { SyncEngine } from './syncEngine';

export type PeerState =
  | 'connecting'
  | 'handshaking'
  | 'syncing'
  | 'idle'
  | 'error'
  | 'closed';

export interface SyncPeer {
  deviceId: string;
  session: SyncSession;
  engine: SyncEngine;
  state: PeerState;
  lastSyncAt: number | null;
  error: string | null;
}

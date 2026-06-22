import { EventEmitter } from 'events';
import { SyncPeerManager } from './syncPeerManager';

export interface SyncSchedulerOptions {
  peerManager: SyncPeerManager;
  intervalMs?: number;
}

export class SyncScheduler extends EventEmitter {
  private peerManager: SyncPeerManager;
  private intervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(opts: SyncSchedulerOptions) {
    super();
    this.peerManager = opts.peerManager;
    this.intervalMs = opts.intervalMs ?? 30_000;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  tick(): void {
    this.peerManager.broadcastLocalChange();
  }

  triggerNow(): void {
    this.tick();
  }

  isRunning(): boolean {
    return this.timer !== null;
  }
}

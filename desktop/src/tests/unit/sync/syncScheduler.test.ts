import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncScheduler } from '../../../main/services/sync/syncScheduler';

function createMockPeerManager() {
  return {
    broadcastLocalChange: vi.fn(),
  };
}

describe('SyncScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not broadcast before start', () => {
    const peerManager = createMockPeerManager();
    new SyncScheduler({ peerManager: peerManager as unknown as SyncScheduler['peerManager'] });
    expect(peerManager.broadcastLocalChange).not.toHaveBeenCalled();
  });

  it('broadcasts on tick', () => {
    const peerManager = createMockPeerManager();
    const scheduler = new SyncScheduler({
      peerManager: peerManager as unknown as SyncScheduler['peerManager'],
    });
    scheduler.tick();
    expect(peerManager.broadcastLocalChange).toHaveBeenCalledTimes(1);
  });

  it('broadcasts periodically after start', () => {
    const peerManager = createMockPeerManager();
    const scheduler = new SyncScheduler({
      peerManager: peerManager as unknown as SyncScheduler['peerManager'],
      intervalMs: 5_000,
    });
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);

    vi.advanceTimersByTime(15_000);
    expect(peerManager.broadcastLocalChange).toHaveBeenCalledTimes(3);

    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it('supports immediate trigger', () => {
    const peerManager = createMockPeerManager();
    const scheduler = new SyncScheduler({
      peerManager: peerManager as unknown as SyncScheduler['peerManager'],
    });
    scheduler.triggerNow();
    expect(peerManager.broadcastLocalChange).toHaveBeenCalledTimes(1);
  });

  it('does not create multiple timers on repeated start', () => {
    const peerManager = createMockPeerManager();
    const scheduler = new SyncScheduler({
      peerManager: peerManager as unknown as SyncScheduler['peerManager'],
      intervalMs: 5_000,
    });
    scheduler.start();
    scheduler.start();

    vi.advanceTimersByTime(5_000);
    expect(peerManager.broadcastLocalChange).toHaveBeenCalledTimes(1);
  });
});

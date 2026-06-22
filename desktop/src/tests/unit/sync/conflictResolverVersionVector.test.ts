import { describe, it, expect } from 'vitest';
import { resolveConflict, SyncVersion } from '../../../main/services/sync/conflictResolver';

describe('conflictResolver with version vectors', () => {
  it('detects concurrent writes when neither vector dominates', () => {
    const local: SyncVersion = {
      id: 'tasks:1:v2',
      updatedAt: 1000,
      version: 2,
      deviceVersion: { alice: 2 },
    };
    const remote: SyncVersion = {
      id: 'tasks:1:v2',
      updatedAt: 1000,
      version: 2,
      deviceVersion: { bob: 3 },
    };
    expect(resolveConflict(local, remote)).toBe('concurrent');
  });

  it('picks local when local vector dominates', () => {
    const local: SyncVersion = {
      id: 'tasks:1:v3',
      updatedAt: 1000,
      version: 3,
      deviceVersion: { alice: 3, bob: 2 },
    };
    const remote: SyncVersion = {
      id: 'tasks:1:v3',
      updatedAt: 1000,
      version: 3,
      deviceVersion: { alice: 2, bob: 2 },
    };
    expect(resolveConflict(local, remote)).toBe('local');
  });

  it('picks remote when remote vector dominates', () => {
    const local: SyncVersion = {
      id: 'tasks:1:v3',
      updatedAt: 1000,
      version: 3,
      deviceVersion: { alice: 2, bob: 2 },
    };
    const remote: SyncVersion = {
      id: 'tasks:1:v3',
      updatedAt: 1000,
      version: 3,
      deviceVersion: { alice: 3, bob: 2 },
    };
    expect(resolveConflict(local, remote)).toBe('remote');
  });

  it('falls back to version tie-breaker when vectors are equal', () => {
    const local: SyncVersion = {
      id: 'tasks:1:v1',
      updatedAt: 1000,
      version: 1,
      deviceVersion: { alice: 1, bob: 1 },
    };
    const remote: SyncVersion = {
      id: 'tasks:1:v2',
      updatedAt: 1000,
      version: 2,
      deviceVersion: { alice: 1, bob: 1 },
    };
    expect(resolveConflict(local, remote)).toBe('remote');
  });

  it('ignores version vectors when timestamps differ', () => {
    const local: SyncVersion = {
      id: 'tasks:1:v1',
      updatedAt: 2000,
      version: 1,
      deviceVersion: { alice: 1 },
    };
    const remote: SyncVersion = {
      id: 'tasks:1:v2',
      updatedAt: 1000,
      version: 2,
      deviceVersion: { bob: 3 },
    };
    expect(resolveConflict(local, remote)).toBe('local');
  });
});

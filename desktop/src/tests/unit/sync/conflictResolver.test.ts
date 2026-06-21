import { describe, it, expect } from 'vitest';
import { resolveConflict, SyncVersion } from '../../../main/services/sync/conflictResolver';

describe('conflictResolver', () => {
  it('keeps local record when local is newer', () => {
    const local: SyncVersion = { id: 'tasks:1:v2', updatedAt: 2000, version: 2 };
    const remote: SyncVersion = { id: 'tasks:1:v1', updatedAt: 1000, version: 1 };
    expect(resolveConflict(local, remote)).toBe('local');
  });

  it('takes remote record when remote is newer', () => {
    const local: SyncVersion = { id: 'tasks:1:v1', updatedAt: 1000, version: 1 };
    const remote: SyncVersion = { id: 'tasks:1:v2', updatedAt: 2000, version: 2 };
    expect(resolveConflict(local, remote)).toBe('remote');
  });

  it('uses version as tie-breaker when timestamps are equal', () => {
    const local: SyncVersion = { id: 'tasks:1:v1', updatedAt: 1000, version: 1 };
    const remote: SyncVersion = { id: 'tasks:1:v2', updatedAt: 1000, version: 2 };
    expect(resolveConflict(local, remote)).toBe('remote');
  });

  it('returns conflict when timestamps and versions are equal', () => {
    const local: SyncVersion = { id: 'tasks:1:v1', updatedAt: 1000, version: 1 };
    const remote: SyncVersion = { id: 'tasks:1:v1', updatedAt: 1000, version: 1 };
    expect(resolveConflict(local, remote)).toBe('conflict');
  });
});

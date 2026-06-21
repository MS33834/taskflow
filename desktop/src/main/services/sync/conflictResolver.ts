export interface SyncVersion {
  id: string;
  updatedAt: number;
  version: number;
}

export type ConflictResult = 'local' | 'remote' | 'conflict';

export function resolveConflict(local: SyncVersion, remote: SyncVersion): ConflictResult {
  if (local.updatedAt > remote.updatedAt) return 'local';
  if (remote.updatedAt > local.updatedAt) return 'remote';
  if (local.version > remote.version) return 'local';
  if (remote.version > local.version) return 'remote';
  return 'conflict';
}

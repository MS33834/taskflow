export interface VersionVector {
  [deviceId: string]: number;
}

export interface SyncVersion {
  id: string;
  updatedAt: number;
  version: number;
  deviceVersion?: VersionVector;
}

export type ConflictResult = 'local' | 'remote' | 'concurrent';

export function resolveConflict(local: SyncVersion, remote: SyncVersion): ConflictResult {
  if (local.updatedAt > remote.updatedAt) return 'local';
  if (remote.updatedAt > local.updatedAt) return 'remote';

  const localVv = local.deviceVersion;
  const remoteVv = remote.deviceVersion;

  if (localVv && remoteVv) {
    const allKeys = new Set([...Object.keys(localVv), ...Object.keys(remoteVv)]);
    const localDominates = Array.from(allKeys).every(
      (deviceId) => (remoteVv[deviceId] ?? 0) <= (localVv[deviceId] ?? 0)
    );
    const remoteDominates = Array.from(allKeys).every(
      (deviceId) => (localVv[deviceId] ?? 0) <= (remoteVv[deviceId] ?? 0)
    );

    if (localDominates && !remoteDominates) return 'local';
    if (remoteDominates && !localDominates) return 'remote';
    if (!localDominates && !remoteDominates) return 'concurrent';
  }

  if (local.version > remote.version) return 'local';
  if (remote.version > local.version) return 'remote';
  return local.id < remote.id ? 'local' : 'remote';
}

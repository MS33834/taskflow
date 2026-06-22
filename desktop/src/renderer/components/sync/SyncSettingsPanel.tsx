import { useEffect } from 'react';
import { Switch } from '../common/Switch';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useSyncStore } from '../../store/syncStore';
import { DeviceList } from './DeviceList';
import { PairingDialog } from './PairingDialog';

export function SyncSettingsPanel() {
  const {
    enabled,
    relayUrl,
    devices,
    isLoading,
    pairingCode,
    dialogMode,
    error,
    peers,
    fetch,
    setEnabled,
    setRelayUrl,
    generatePairingCode,
    claimPairingCode,
    removeDevice,
    setDialogMode,
    clearError,
    setStateFromPush,
    setPeers,
  } = useSyncStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    const unsubscribe = window.taskflowAPI.sync.onStateChanged((state) => {
      setStateFromPush(state);
    });
    return () => {
      unsubscribe();
    };
  }, [setStateFromPush]);

  useEffect(() => {
    const unsubscribe = window.taskflowAPI.sync.onPeerStateChanged((nextPeers) => {
      setPeers(nextPeers);
    });
    return () => {
      unsubscribe();
    };
  }, [setPeers]);

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">加载同步设置...</p>;
  }

  return (
    <div className="space-y-5">
      <Switch
        label="启用端到端加密同步"
        checked={enabled}
        onChange={(checked) => setEnabled(checked)}
      />

      {enabled && (
        <>
          <div className="space-y-2">
            <Input
              label="自托管中继地址"
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              placeholder="ws://relay.local:8787 或 http://relay.local:8787"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              请填写你自己部署的中继服务器地址。数据在离开设备前已加密，中继无法读取内容。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDialogMode('host')}>
              添加设备
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDialogMode('join')}>
              加入设备
            </Button>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-100">已配对设备</h3>
            <DeviceList devices={devices} peers={peers} onRemove={removeDevice} />
          </div>
        </>
      )}

      <PairingDialog
        mode={dialogMode}
        pairingCode={pairingCode}
        error={error}
        onClose={() => setDialogMode('none')}
        onGenerate={generatePairingCode}
        onClaim={claimPairingCode}
        onClearError={clearError}
      />
    </div>
  );
}

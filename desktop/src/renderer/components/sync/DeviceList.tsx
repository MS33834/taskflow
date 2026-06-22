import { Button } from '../common/Button';
import type { SyncDeviceInfo } from '../../store/syncStore';
import { formatLastSeen } from '../../store/syncStore';

interface DeviceListProps {
  devices: SyncDeviceInfo[];
  onRemove: (deviceId: string) => void;
}

export function DeviceList({ devices, onRemove }: DeviceListProps) {
  if (devices.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        暂无已配对设备。点击「添加设备」将其他设备加入同步。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
      {devices.map((device) => (
        <li key={device.deviceId} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {device.name ?? `Device-${device.deviceId.slice(0, 4)}`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ID: {device.deviceId} · 上次在线: {formatLastSeen(device.lastSeenAt)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onRemove(device.deviceId)}>
            移除
          </Button>
        </li>
      ))}
    </ul>
  );
}

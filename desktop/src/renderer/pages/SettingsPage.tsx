import { useState } from 'react';
import { Switch } from '../components/common/Switch';
import { Button } from '../components/common/Button';

export function SettingsPage() {
  const [autoLock, setAutoLock] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">设置</h1>
      <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <h2 className="mb-3 font-medium text-slate-800">安全</h2>
          <Switch label="5 分钟无操作自动锁定" checked={autoLock} onChange={setAutoLock} />
        </div>
        <div>
          <h2 className="mb-3 font-medium text-slate-800">外观</h2>
          <Switch label="深色模式" checked={darkMode} onChange={setDarkMode} />
        </div>
        <div>
          <h2 className="mb-3 font-medium text-slate-800">数据</h2>
          <div className="flex gap-3">
            <Button variant="secondary">导出备份</Button>
            <Button variant="secondary">导入备份</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

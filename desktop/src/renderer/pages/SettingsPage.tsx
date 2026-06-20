import { useState } from 'react';
import { Switch } from '../components/common/Switch';
import { Button } from '../components/common/Button';
import { useThemeStore, type ThemeMode } from '../store/themeStore';
import { useSecuritySettingsStore } from '../store/securitySettingsStore';
import { useTaskStore } from '../store/taskStore';
import { useVaultStore } from '../store/vaultStore';

const themeLabels: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};

export function SettingsPage() {
  const { mode, setMode } = useThemeStore();
  const { isLoading, update, fetch: fetchSecuritySettings, ...settings } = useSecuritySettingsStore();
  const { fetch: fetchTasks } = useTaskStore();
  const { fetch: fetchVault } = useVaultStore();
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleExport = async () => {
    setIsBusy(true);
    try {
      const result = await window.taskflowAPI.backup.exportBackup();
      showFeedback(result.success ? `导出成功：${result.message}` : `导出失败：${result.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    const confirmed = window.confirm(
      '导入备份将覆盖当前所有数据（任务、保险库、分类和设置）。\n\n确定要继续吗？'
    );
    if (!confirmed) return;

    const hasVerifier = await window.taskflowAPI.auth.hasVerifier();
    let password: string | null;
    let newPassword: string | undefined;

    if (hasVerifier) {
      password = window.prompt('请输入当前解锁密码以恢复备份。');
    } else {
      password = window.prompt('请输入备份的解锁密码。');
      if (!password) return;
      newPassword = window.prompt('请为应用设置新密码以加密恢复后的数据。') ?? undefined;
    }

    if (!password) return;
    if (!hasVerifier && !newPassword) return;

    setIsBusy(true);
    try {
      const result = await window.taskflowAPI.backup.importBackup(password, newPassword);
      if (result.success) {
        await Promise.all([fetchTasks(), fetchVault(), fetchSecuritySettings()]);
      }
      showFeedback(result.success ? `导入成功：${result.message}` : `导入失败：${result.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-slate-800 dark:text-slate-100">设置</h1>
        <p className="text-slate-500 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800 dark:text-slate-100">设置</h1>
      <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div>
          <h2 className="mb-3 font-medium text-slate-800 dark:text-slate-100">安全</h2>
          <div className="space-y-3">
            <Switch
              label="5 分钟无操作自动锁定"
              checked={settings.autoLockMinutes > 0}
              onChange={(checked) => update({ autoLockMinutes: checked ? 5 : 0 })}
            />
            <Switch
              label="截图/录屏保护"
              checked={settings.screenshotProtection}
              onChange={(checked) => update({ screenshotProtection: checked })}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              开启后，Windows/macOS 上的截图和录屏工具将无法捕获 TaskFlow 窗口内容。
            </p>
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-medium text-slate-800 dark:text-slate-100">外观</h2>
          <div className="flex gap-2">
            {(Object.keys(themeLabels) as ThemeMode[]).map((themeMode) => (
              <Button
                key={themeMode}
                variant={mode === themeMode ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMode(themeMode)}
              >
                {themeLabels[themeMode]}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-medium text-slate-800 dark:text-slate-100">数据</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={handleExport} disabled={isBusy}>
              导出备份
            </Button>
            <Button variant="secondary" onClick={handleImport} disabled={isBusy}>
              导入备份
            </Button>
            {feedback && <span className="text-sm text-slate-600 dark:text-slate-400">{feedback}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            备份文件使用当前主密钥加密，仅能通过相同的解锁密码恢复。
          </p>
        </div>
      </div>
    </div>
  );
}

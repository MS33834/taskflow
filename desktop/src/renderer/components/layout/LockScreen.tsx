import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

export function LockScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const { unlock, unlockWithBiometric } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const available = await window.taskflowAPI.biometric.isAvailable();
      const enabled = await window.taskflowAPI.biometric.isEnabled();
      if (mounted) {
        setBiometricAvailable(available);
        setBiometricEnabled(enabled);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await unlock(password);
    if (!success) setError('密码错误');
  };

  const handleBiometric = async () => {
    setError('');
    const success = await unlockWithBiometric();
    if (!success) setError('生物识别验证失败');
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="mb-8 text-3xl font-semibold text-slate-800 dark:text-slate-100">TaskFlow</div>
      <form onSubmit={handleSubmit} className="w-80 space-y-4">
        <Input
          type="password"
          placeholder="输入主密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full">
          解锁
        </Button>
        {biometricAvailable && biometricEnabled && (
          <Button type="button" variant="secondary" className="w-full" onClick={handleBiometric}>
            使用生物识别解锁
          </Button>
        )}
      </form>
      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">本地加密 · 数据不上传</p>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useVaultStore } from '../../store/vaultStore';
import type { VaultField } from '../../../shared/types';

export function VaultEditor() {
  const [title, setTitle] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const { create, generatePassword } = useVaultStore();

  const handleGenerate = async () => {
    const pwd = await generatePassword(16);
    setPassword(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const fields: VaultField[] = [
      { id: crypto.randomUUID(), name: '账号', value: account, isSensitive: false },
      { id: crypto.randomUUID(), name: '密码', value: password, isSensitive: true },
    ];
    await create({ type: 'password', title, fields, isHidden: false });
    setTitle('');
    setAccount('');
    setPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <Input placeholder="名称（如 GitHub）" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="账号" value={account} onChange={(e) => setAccount(e.target.value)} />
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={handleGenerate}>
          生成
        </Button>
      </div>
      <Button type="submit">保存到保险库</Button>
    </form>
  );
}

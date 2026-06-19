import { useState } from 'react';
import type { VaultItem } from '../../../shared/types';
import { Button } from '../common/Button';
import { useVaultStore } from '../../store/vaultStore';

interface VaultCardProps {
  item: VaultItem;
}

export function VaultCard({ item }: VaultCardProps) {
  const [showSensitive, setShowSensitive] = useState(false);
  const { delete: deleteItem } = useVaultStore();

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    await window.taskflowAPI.security.clearClipboard();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{item.title}</h3>
        <button onClick={() => deleteItem(item.id)} className="text-sm text-slate-400 hover:text-danger">
          删除
        </button>
      </div>
      <div className="space-y-2">
        {item.fields.map((field) => (
          <div key={field.id} className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{field.name}</span>
            <div className="flex items-center gap-2">
              <span className={field.isSensitive && !showSensitive ? 'blur-sm' : ''}>
                {field.isSensitive && !showSensitive ? '••••••••' : field.value}
              </span>
              {field.isSensitive && (
                <Button variant="ghost" size="sm" onClick={() => setShowSensitive(!showSensitive)}>
                  {showSensitive ? '隐藏' : '显示'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => handleCopy(field.value)}>
                复制
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

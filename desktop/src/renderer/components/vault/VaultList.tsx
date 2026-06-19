import { useEffect } from 'react';
import { useVaultStore } from '../../store/vaultStore';
import { VaultCard } from './VaultCard';
import { VaultEditor } from './VaultEditor';

export function VaultList() {
  const { items, loading, fetch } = useVaultStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div>
      <VaultEditor />
      {loading ? (
        <p>加载中...</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <VaultCard key={item.id} item={item} />
          ))}
          {items.length === 0 && <p className="text-slate-400">保险库为空</p>}
        </div>
      )}
    </div>
  );
}

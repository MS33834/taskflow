import { VaultList } from '../components/vault/VaultList';

export function VaultPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">加密保险库</h1>
      <VaultList />
    </div>
  );
}

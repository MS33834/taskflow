import { useAuthStore } from '../../store/authStore';
import { Button } from '../common/Button';

interface SidebarProps {
  current: string;
  onChange: (page: string) => void;
  privacyMode?: boolean;
}

const items = [
  { id: 'today', label: '今日任务' },
  { id: 'calendar', label: '日历' },
  { id: 'vault', label: '保险库' },
  { id: 'settings', label: '设置' },
];

export function Sidebar({ current, onChange, privacyMode }: SidebarProps) {
  const { lock } = useAuthStore();

  return (
    <aside
      className={`flex w-56 flex-col border-r border-slate-200 bg-white transition-opacity dark:border-slate-700 dark:bg-slate-800 ${privacyMode ? 'opacity-50' : ''}`}
    >
      <div className="p-4 text-lg font-semibold text-slate-800 dark:text-slate-100">TaskFlow</div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              current === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-3">
        <Button variant="ghost" className="w-full justify-start" onClick={lock}>
          锁定
        </Button>
      </div>
    </aside>
  );
}

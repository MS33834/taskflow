import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { LockScreen } from './components/layout/LockScreen';
import { Sidebar } from './components/layout/Sidebar';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { VaultPage } from './pages/VaultPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const { isUnlocked, isLoading, checkStatus } = useAuthStore();
  const [currentPage, setCurrentPage] = useState('today');

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (isLoading) return <div className="flex h-screen items-center justify-center">加载中...</div>;
  if (!isUnlocked) return <LockScreen />;

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar current={currentPage} onChange={setCurrentPage} />
      <main className="flex-1 overflow-auto p-6">
        {currentPage === 'today' && <TodayPage />}
        {currentPage === 'calendar' && <CalendarPage />}
        {currentPage === 'vault' && <VaultPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;

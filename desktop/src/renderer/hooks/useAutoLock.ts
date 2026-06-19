import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAutoLock(minutes: number) {
  const { lock } = useAuthStore();

  useEffect(() => {
    if (minutes <= 0) return;

    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => lock(), minutes * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'mousemove'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [minutes, lock]);
}

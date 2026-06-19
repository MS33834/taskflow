import { useEffect } from 'react';
import { Button } from './Button';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    info: 'bg-slate-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-danger text-white',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${styles[type]}`}>
      <span className="text-sm">{message}</span>
      <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={onClose}>
        关闭
      </Button>
    </div>
  );
}

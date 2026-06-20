import { useState, useEffect, useCallback } from 'react';

export function usePrivacyMode() {
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    const handler = () => setPrivacyMode((prev) => !prev);
    window.addEventListener('toggle-privacy', handler);
    return () => window.removeEventListener('toggle-privacy', handler);
  }, []);

  // 在渲染进程内监听 Escape 键切换隐私模式，替代原先的全局快捷键，
  // 避免拦截系统中其他应用的 Escape 行为。
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPrivacyMode((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return privacyMode;
}

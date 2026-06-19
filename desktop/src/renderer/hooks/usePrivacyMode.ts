import { useState, useEffect } from 'react';

export function usePrivacyMode() {
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    const handler = () => setPrivacyMode((prev) => !prev);
    window.addEventListener('toggle-privacy', handler);
    return () => window.removeEventListener('toggle-privacy', handler);
  }, []);

  return privacyMode;
}

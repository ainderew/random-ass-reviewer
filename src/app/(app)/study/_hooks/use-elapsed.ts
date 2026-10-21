'use client';

import { useEffect, useState } from 'react';

// Wall-clock display only. Ticks once a second while active; the credited
// number always comes from the server.
export function useElapsed(startedAt: string | null, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    // Background tabs throttle the interval, so the clock looks frozen while
    // she is in another app. Snap it to the truth the instant she returns.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active]);

  if (!active || !startedAt) return 0;
  return Math.max(0, now - Date.parse(startedAt));
}

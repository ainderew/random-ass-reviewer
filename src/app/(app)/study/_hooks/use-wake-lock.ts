'use client';

import { useEffect } from 'react';

// Keeps the screen on while a session runs, so a phone propped beside paper
// notes does not lock itself. Browsers drop the lock whenever the page is
// hidden; it is taken again on return. Where the API is missing, or the
// battery is low, the screen may sleep and the time still counts.
export function useWakeLock(on: boolean): void {
  useEffect(() => {
    if (!on || typeof navigator === 'undefined' || !('wakeLock' in navigator))
      return;
    let lock: WakeLockSentinel | null = null;
    let live = true;
    const take = async () => {
      if (document.visibilityState !== 'visible') return;
      if (lock && !lock.released) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (live) lock = next;
        else void next.release();
      } catch {
        // Refused (low battery, no permission). Nothing else to do.
      }
    };
    void take();
    document.addEventListener('visibilitychange', take);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', take);
      void lock?.release().catch(() => undefined);
    };
  }, [on]);
}

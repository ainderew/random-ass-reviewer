'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const readOnline = () =>
  typeof navigator === 'undefined' ? true : navigator.onLine;

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, readOnline, () => true);
}

// Non-blocking. A running timer keeps running; heartbeats catch up on their own.
export const ConnectionStatus = () => {
  const online = useOnline();
  if (online) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className="border-b border-hairline bg-ground-2 px-4 py-2 text-center text-sm text-ink-2"
    >
      You are offline. Anything you do now is kept and sent when you are back.
    </p>
  );
};

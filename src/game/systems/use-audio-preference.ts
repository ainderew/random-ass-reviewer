'use client';

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'aloft:audio';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

// Muted by default, always. The toggle is the user gesture browsers require.
export function useAudioPreference(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, read, () => false);
  const setEnabled = useCallback((next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off');
    } catch {
      // Private mode. The in-memory listeners still fire.
    }
    for (const listener of listeners) listener();
  }, []);
  return [enabled, setEnabled];
}

'use client';

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'aloft:island-list';
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

// The accessible path to the island is the list, not a canvas pretending to
// be navigable. This makes it a choice, not a fallback.
export function useIslandListPreference(): [boolean, (on: boolean) => void] {
  const value = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((on: boolean) => {
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      // Private mode. Listeners still fire for this session.
    }
    for (const listener of listeners) listener();
  }, []);
  return [value, set];
}

'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { SessionLength } from '@/domain/session/rungs';

// The chosen timer length is stored in this browser.
const LENGTH_KEY = 'aloft:session-length';
const listeners = new Set<() => void>();

function readLength(): SessionLength {
  try {
    const raw = localStorage.getItem(LENGTH_KEY);
    if (raw === '5') return 5;
    if (raw === '15') return 15;
    if (raw === '25') return 25;
    if (raw === '50') return 50;
    if (raw === 'open') return null;
  } catch {
    // Private mode. Fall through to the default.
  }
  return 25;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode. Listeners still fire for this session.
  }
  for (const listener of listeners) listener();
}

export function useSessionPreferences(): {
  length: SessionLength;
  setLength: (length: SessionLength) => void;
} {
  const length = useSyncExternalStore(
    subscribe,
    readLength,
    (): SessionLength => 25,
  );
  const setLength = useCallback(
    (next: SessionLength) =>
      write(LENGTH_KEY, next === null ? 'open' : String(next)),
    [],
  );
  return { length, setLength };
}

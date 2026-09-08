'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { SessionLength } from '@/domain/session/rungs';

// Length and aim are the student's own choices and the server never needs
// them: a shape over the meter, a name on the goal. They live in the browser.
const LENGTH_KEY = 'aloft:session-length';
const AIM_KEY = 'aloft:aim';
const listeners = new Set<() => void>();

function readLength(): SessionLength {
  try {
    const raw = localStorage.getItem(LENGTH_KEY);
    if (raw === '25') return 25;
    if (raw === '50') return 50;
    if (raw === 'open') return null;
  } catch {
    // Private mode. Fall through to the default.
  }
  return 25;
}

function readAim(): string | null {
  try {
    return localStorage.getItem(AIM_KEY);
  } catch {
    return null;
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
  aimAssetId: string | null;
  setAim: (assetId: string | null) => void;
} {
  const length = useSyncExternalStore(
    subscribe,
    readLength,
    (): SessionLength => 25,
  );
  const aimAssetId = useSyncExternalStore(
    subscribe,
    readAim,
    (): string | null => null,
  );
  const setLength = useCallback(
    (next: SessionLength) =>
      write(LENGTH_KEY, next === null ? 'open' : String(next)),
    [],
  );
  const setAim = useCallback(
    (assetId: string | null) => write(AIM_KEY, assetId),
    [],
  );
  return { length, setLength, aimAssetId, setAim };
}

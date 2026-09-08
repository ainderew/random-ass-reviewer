'use client';

import { useCallback, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';
const KEY = 'aloft:motion';
const listeners = new Set<() => void>();

export type MotionPreference = 'system' | 'reduce';

function readPreference(): MotionPreference {
  try {
    return localStorage.getItem(KEY) === 'reduce' ? 'reduce' : 'system';
  } catch {
    return 'system';
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  let media: MediaQueryList | null = null;
  if (typeof window.matchMedia === 'function') {
    media = window.matchMedia(QUERY);
    media.addEventListener('change', onChange);
  }
  return () => {
    listeners.delete(onChange);
    media?.removeEventListener('change', onChange);
  };
}

// Treats an environment without matchMedia (tests, old engines) as reduced,
// which is the safe default. A stored "reduce" always wins; the OS setting
// can only add motion reduction, never remove it.
export function readReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  if (readPreference() === 'reduce') return true;
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, readReducedMotion, () => true);
}

export function useMotionPreference(): [
  MotionPreference,
  (next: MotionPreference) => void,
] {
  const value = useSyncExternalStore(
    subscribe,
    readPreference,
    (): MotionPreference => 'system',
  );
  const set = useCallback((next: MotionPreference) => {
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Private mode. Listeners still fire for this session.
    }
    for (const listener of listeners) listener();
  }, []);
  return [value, set];
}

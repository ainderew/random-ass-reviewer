'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { StudyBudget } from '@/domain/review/today';

// How big today's review is. The student's own choice, kept in the browser
// so it does not reset on every visit. 15 minutes (about 18 cards) to start.
const KEY = 'aloft:review-minutes';
const listeners = new Set<() => void>();

function read(): StudyBudget {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === '5') return 5;
    if (raw === '30') return 30;
  } catch {
    // Private mode. Fall through to the default.
  }
  return 15;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useReviewSize(): [StudyBudget, (size: StudyBudget) => void] {
  const size = useSyncExternalStore(subscribe, read, () => 15 as StudyBudget);
  const set = useCallback((next: StudyBudget) => {
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      // Private mode. Listeners still fire for this session.
    }
    for (const listener of listeners) listener();
  }, []);
  return [size, set];
}

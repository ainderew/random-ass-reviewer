'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import type { WeeklySummary } from '@/domain/types';
import { apiFetch } from '@/lib/api-client';

const KEY = 'aloft:weekly-seen';
const listeners = new Set<() => void>();

function readSeen(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

// Shown once per ISO week. Dismissal is remembered per browser.
export function useWeeklySummary(): {
  summary: WeeklySummary | null;
  visible: boolean;
  dismiss: () => void;
} {
  const query = useQuery({
    queryKey: ['stats', 'weekly'],
    queryFn: () => apiFetch<WeeklySummary>('/api/stats/weekly'),
    staleTime: 5 * 60_000,
  });
  const seen = useSyncExternalStore(subscribe, readSeen, () => '');
  const summary = query.data ?? null;
  const dismiss = useCallback(() => {
    if (!summary) return;
    try {
      localStorage.setItem(KEY, summary.weekStart);
    } catch {
      // Private mode. Listeners still fire for this session.
    }
    for (const listener of listeners) listener();
  }, [summary]);
  const visible =
    summary !== null && summary.sessions > 0 && seen !== summary.weekStart;
  return { summary, visible, dismiss };
}

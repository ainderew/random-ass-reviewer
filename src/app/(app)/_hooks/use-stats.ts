'use client';

import { useQuery } from '@tanstack/react-query';
import type { StatsSnapshot } from '@/domain/types';
import { apiFetch } from '@/lib/api-client';
import { statsQueryKey } from '@/lib/query-keys';

// TanStack Query is the single source of truth for server data. Mutations
// invalidate this key; nothing copies balances anywhere else.
export function useStats() {
  return useQuery({
    queryKey: statsQueryKey,
    queryFn: () => apiFetch<StatsSnapshot>('/api/stats'),
  });
}

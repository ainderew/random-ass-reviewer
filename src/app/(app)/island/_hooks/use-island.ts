'use client';

import { useQuery } from '@tanstack/react-query';
import type { IslandView } from '@/domain/types';
import { apiFetch } from '@/lib/api-client';
import { islandQueryKey } from '@/lib/query-keys';

export function useIsland() {
  return useQuery({
    queryKey: islandQueryKey,
    queryFn: () => apiFetch<IslandView>('/api/island'),
  });
}

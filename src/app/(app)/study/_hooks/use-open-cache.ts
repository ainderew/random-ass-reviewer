'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CacheOpenResponse, StatsSnapshot } from '@/domain/types';
import { postJson } from '@/lib/api-client';
import { islandQueryKey, statsQueryKey } from '@/lib/query-keys';

// Server-authoritative reveal. The response is the only place contents exist.
export function useOpenCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cacheId: string) =>
      postJson<CacheOpenResponse>(`/api/cache/${cacheId}/open`),
    onSuccess: (data) => {
      queryClient.setQueryData<StatsSnapshot>(statsQueryKey, (old) =>
        old
          ? {
              ...old,
              stats: {
                ...old.stats,
                focusBalance:
                  old.stats.focusBalance +
                  (data.alreadyOpened ? 0 : data.contents.focus),
                insightBalance:
                  old.stats.insightBalance +
                  (data.alreadyOpened ? 0 : data.contents.insight),
              },
            }
          : old,
      );
      void queryClient.invalidateQueries({ queryKey: statsQueryKey });
      void queryClient.invalidateQueries({ queryKey: islandQueryKey });
    },
  });
}

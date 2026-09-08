'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  IslandView,
  RemovePlacementResponse,
  StatsSnapshot,
} from '@/domain/types';
import { ApiError, apiFetch } from '@/lib/api-client';
import { islandQueryKey, statsQueryKey } from '@/lib/query-keys';

export function useRemovePlacement(onDone: (message: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (placementId: string) =>
      apiFetch<RemovePlacementResponse>(`/api/island/place/${placementId}`, {
        method: 'DELETE',
      }),
    onSuccess: (data, placementId) => {
      queryClient.setQueryData<IslandView>(islandQueryKey, (old) =>
        old
          ? {
              ...old,
              placements: old.placements.filter((p) => p.id !== placementId),
            }
          : old,
      );
      queryClient.setQueryData<StatsSnapshot>(statsQueryKey, (old) =>
        old ? { ...old, stats: data.stats } : old,
      );
      void queryClient.invalidateQueries({ queryKey: islandQueryKey });
      onDone(`Removed. ${data.refund.focus} Focus back.`);
    },
    onError: (error) => {
      onDone(
        error instanceof ApiError
          ? error.message
          : 'Could not remove that. Try again.',
      );
    },
  });
}

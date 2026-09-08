'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  IslandView,
  PlaceAssetRequest,
  PlaceAssetResponse,
  StatsSnapshot,
} from '@/domain/types';
import { useIslandStore } from '@/game/store/island-store';
import { ApiError, postJson } from '@/lib/api-client';
import { islandQueryKey, statsQueryKey } from '@/lib/query-keys';

// Optimistic object, never optimistic money. The ghost placement is a
// rollback-able visual; the balance only moves when the server says so.
export function usePlaceAsset(onError: (message: string) => void) {
  const queryClient = useQueryClient();
  const addPending = useIslandStore((s) => s.addPending);
  const removePending = useIslandStore((s) => s.removePending);

  return useMutation({
    mutationFn: (body: PlaceAssetRequest) =>
      postJson<PlaceAssetResponse>('/api/island/place', body),
    onMutate: (body) => {
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      addPending({
        id: tempId,
        islandId: '',
        assetId: body.assetId,
        x: body.x,
        z: body.z,
        rotY: body.rotY ?? 0,
        placedAt: new Date(),
      });
      return { tempId };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<IslandView>(islandQueryKey, (old) =>
        old ? { ...old, placements: [...old.placements, data.placement] } : old,
      );
      queryClient.setQueryData<StatsSnapshot>(statsQueryKey, (old) =>
        old ? { ...old, stats: data.stats } : old,
      );
      void queryClient.invalidateQueries({ queryKey: islandQueryKey });
    },
    onError: (error) => {
      onError(
        error instanceof ApiError
          ? error.message
          : 'Could not place that. Try again.',
      );
    },
    onSettled: (_data, _error, _body, context) => {
      if (context) removePending(context.tempId);
    },
  });
}

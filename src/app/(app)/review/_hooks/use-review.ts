'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnswerResult,
  QueuedCard,
  ReviewAnswerRequest,
  ReviewStats,
} from '@/domain/types';
import { apiFetch, postJson } from '@/lib/api-client';
import {
  reviewQueueKey,
  reviewStatsKey,
  statsQueryKey,
} from '@/lib/query-keys';

export function useReviewQueue() {
  return useQuery({
    queryKey: reviewQueueKey,
    queryFn: () => apiFetch<QueuedCard[]>('/api/review/queue'),
    // The queue is a snapshot for this sitting; position lives on the client.
    // A refetch mid-session would shift the index under the user's feet.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: reviewStatsKey,
    queryFn: () => apiFetch<ReviewStats>('/api/review/stats'),
  });
}

// Money is never optimistic. The HUD updates from the server's number.
export function useSubmitAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewAnswerRequest) =>
      postJson<AnswerResult>('/api/review/answer', body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statsQueryKey });
      void queryClient.invalidateQueries({ queryKey: reviewStatsKey });
    },
  });
}

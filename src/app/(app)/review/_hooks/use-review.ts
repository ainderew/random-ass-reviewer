'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnswerResult,
  QueuedCard,
  ReviewAnswerRequest,
  ReviewStats,
} from '@/domain/types';
import type { MedtechSubject } from '@/domain/study/medtech';
import type { QuizContent } from '@/domain/study/quiz-content';
import { apiFetch, postJson } from '@/lib/api-client';
import {
  reviewQueueFor,
  reviewQueueKey,
  reviewStatsKey,
  statsQueryKey,
} from '@/lib/query-keys';

export function useReviewQueue(subject?: MedtechSubject) {
  return useQuery({
    queryKey: reviewQueueFor(subject),
    queryFn: () =>
      apiFetch<QueuedCard[]>(
        subject ? `/api/review/queue?subject=${subject}` : '/api/review/queue',
      ),
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
      void queryClient.invalidateQueries({ queryKey: ['today-plan'] });
      void queryClient.invalidateQueries({ queryKey: statsQueryKey });
      void queryClient.invalidateQueries({ queryKey: reviewStatsKey });
    },
  });
}

// Writes choices for one card and patches it in the queue snapshot, so the
// options appear on the card the student is looking at.
export function useMakeChoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) =>
      postJson<{ quiz: QuizContent }>(`/api/cards/${cardId}/choices`),
    onSuccess: ({ quiz }, cardId) => {
      queryClient.setQueriesData<QueuedCard[]>(
        { queryKey: reviewQueueKey },
        (queue) =>
          queue?.map((card) => (card.id === cardId ? { ...card, quiz } : card)),
      );
    },
  });
}

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnswerResult, ReviewAnswerRequest } from '@/domain/types';
import { ApiError, postJson } from '@/lib/api-client';
import { reviewStatsKey, statsQueryKey } from '@/lib/query-keys';

export const MAX_QUEUED_ANSWERS = 20;
const RETRY_MS = 3000;

export type AnswerOutcome =
  | { kind: 'ok'; result: AnswerResult }
  | { kind: 'gone' }
  | { kind: 'queued' }
  | { kind: 'overflow' };

const isTransient = (error: unknown) =>
  !(error instanceof ApiError) || error.status >= 500;

// Answers that fail on the network wait here and retry in order. The
// student keeps moving; money still comes only from the server's reply.
export function useAnswerQueue(onFlushed: (result: AnswerResult) => void) {
  const queryClient = useQueryClient();
  const queue = useRef<ReviewAnswerRequest[]>([]);
  const flushing = useRef(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: statsQueryKey });
    void queryClient.invalidateQueries({ queryKey: reviewStatsKey });
  }, [queryClient]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      while (queue.current.length > 0) {
        const head = queue.current[0]!;
        try {
          const result = await postJson<AnswerResult>(
            '/api/review/answer',
            head,
          );
          queue.current.shift();
          setPending(queue.current.length);
          onFlushed(result);
          invalidate();
        } catch (error) {
          if (isTransient(error)) return;
          // A permanent refusal (deleted card, bad request) is dropped.
          queue.current.shift();
          setPending(queue.current.length);
        }
      }
    } finally {
      flushing.current = false;
    }
  }, [invalidate, onFlushed]);

  useEffect(() => {
    const id = setInterval(() => {
      if (queue.current.length > 0) void flush();
    }, RETRY_MS);
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [flush]);

  const submit = useCallback(
    async (body: ReviewAnswerRequest): Promise<AnswerOutcome> => {
      if (queue.current.length > 0) {
        // Keep order: anything behind a stuck answer waits with it.
        return enqueue(body);
      }
      try {
        const result = await postJson<AnswerResult>('/api/review/answer', body);
        invalidate();
        return { kind: 'ok', result };
      } catch (error) {
        if (error instanceof ApiError && error.code === 'NOT_FOUND')
          return { kind: 'gone' };
        if (!isTransient(error)) throw error;
        return enqueue(body);
      }
      function enqueue(item: ReviewAnswerRequest): AnswerOutcome {
        if (queue.current.length >= MAX_QUEUED_ANSWERS) {
          setFailed(true);
          return { kind: 'overflow' };
        }
        queue.current.push(item);
        setPending(queue.current.length);
        void flush();
        return { kind: 'queued' };
      }
    },
    [invalidate, flush],
  );

  return { submit, pending, failed };
}

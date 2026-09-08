'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { QuizProgress, QuizResult } from '@/domain/types';
import { sessionQuizKey, statsQueryKey } from '@/lib/query-keys';
import { answerQuiz, fetchSessionQuiz, finishQuiz } from './session-api';

// Questions come once per session (seeded server-side, stable across a
// refresh). Each answer is graded by the server; the running multiplier is
// its number, never a local guess.
export function useSessionQuiz(sessionId: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  const quiz = useQuery({
    queryKey: sessionQuizKey(sessionId),
    queryFn: () => fetchSessionQuiz(sessionId),
    staleTime: Infinity,
  });
  const answer = useMutation({
    mutationFn: (input: { cardId: string; optionIndex: number }) =>
      answerQuiz({ sessionId, ...input }),
    onSuccess: setProgress,
  });
  const finish = useMutation({
    mutationFn: () => finishQuiz(sessionId),
    onSuccess: (result: QuizResult) => {
      void queryClient.invalidateQueries({ queryKey: statsQueryKey });
      return result;
    },
  });
  return { quiz, answer, finish, progress };
}

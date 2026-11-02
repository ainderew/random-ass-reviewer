'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Card, NoteDetail, QueuedCard } from '@/domain/types';
import type { QuizContent } from '@/domain/study/quiz-content';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { noteDetailKey, reviewQueueKey } from '@/lib/query-keys';

export function CardChoices({
  card,
  sourceId,
  disabled,
}: {
  card: Card;
  sourceId: string;
  disabled: boolean;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const generate = useMutation({
    mutationFn: () =>
      apiFetch<{ quiz: QuizContent }>(`/api/cards/${card.id}/choices`, {
        method: 'POST',
      }),
    onSuccess: ({ quiz }) => {
      client.setQueryData<NoteDetail>(
        noteDetailKey(sourceId),
        (detail) =>
          detail && {
            ...detail,
            cards: detail.cards.map((item) =>
              item.id === card.id ? { ...item, quiz } : item,
            ),
          },
      );
      client.setQueriesData<QueuedCard[]>(
        { queryKey: reviewQueueKey },
        (queue) =>
          queue?.map((item) =>
            item.id === card.id ? { ...item, quiz } : item,
          ),
      );
      setOpen(true);
    },
  });
  const quiz = card.quiz ?? generate.data?.quiz;
  return (
    <div className="mt-5 border-t border-hairline pt-4 text-sm text-ink-2">
      {quiz ? (
        <details
          open={open}
          onToggle={(event) => setOpen(event.currentTarget.open)}
        >
          <summary className="min-h-11 cursor-pointer content-center font-medium">
            Multiple choice · 4 options
          </summary>
          <ul className="mt-3 space-y-3">
            <li>
              <p className="font-medium text-focus">
                {card.answer} <span className="text-xs">· Correct</span>
              </p>
              {quiz.explanation && <p className="mt-1">{quiz.explanation}</p>}
            </li>
            {quiz.distractors.map((option, index) => (
              <li key={index}>
                <p className="font-medium">{option.text}</p>
                {option.explanation && (
                  <p className="mt-1">{option.explanation}</p>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <Button
          variant="ghost"
          disabled={disabled || generate.isPending}
          aria-busy={generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending
            ? 'Generating choices…'
            : 'Generate multiple choice'}
        </Button>
      )}
      {generate.isPending && (
        <p role="status" className="mt-2">
          AI is using your notes…
        </p>
      )}
      {generate.isSuccess && (
        <p role="status" className="mt-3 text-focus">
          Choices saved. Check them against your notes.
        </p>
      )}
      {generate.isError && (
        <p role="alert" className="mt-2 text-warn">
          {generate.error.message} Try again.
        </p>
      )}
    </div>
  );
}

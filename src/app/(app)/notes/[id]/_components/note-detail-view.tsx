'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Card, NoteDetail, UpdateCardRequest } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { noteDetailKey, notesQueryKey } from '@/lib/query-keys';
import { CardEditor } from './card-editor';
import { CardDetails } from './card-details';
import { GenerationProgress } from './generation-progress';
import { CardFilters, type CardFilter } from './card-filters';

export const NoteDetailView = ({
  sourceId,
  existing,
}: {
  sourceId: string;
  existing: boolean;
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState<CardFilter>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: noteDetailKey(sourceId),
    queryFn: () => apiFetch<NoteDetail>(`/api/notes/${sourceId}`),
    // Poll while generation runs; stop once it reports finished.
    refetchInterval: (query) =>
      query.state.data?.status.finished ? false : 2000,
  });

  const update = useMutation({
    mutationFn: ({ cardId, ...body }: UpdateCardRequest & { cardId: string }) =>
      apiFetch<Card>(`/api/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (saved) => {
      setNotice(
        saved.reviewStatus === 'approved'
          ? 'Card saved and ready for review.'
          : 'Changes saved. This card stays out of review until approved.',
      );
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['review'] });
      void queryClient.invalidateQueries({ queryKey: ['study-plan'] });
      void queryClient.invalidateQueries({ queryKey: ['today-plan'] });
      void queryClient.invalidateQueries({ queryKey: ['mistake-checks'] });
      void queryClient.invalidateQueries({ queryKey: noteDetailKey(sourceId) });
    },
  });
  const remove = useMutation({
    mutationFn: (cardId: string) =>
      apiFetch<unknown>(`/api/cards/${cardId}`, { method: 'DELETE' }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: noteDetailKey(sourceId) }),
  });
  const retry = useMutation({
    mutationFn: () =>
      apiFetch<unknown>(`/api/notes/${sourceId}/generate`, { method: 'POST' }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: noteDetailKey(sourceId) }),
  });
  const removeSource = useMutation({
    mutationFn: () =>
      apiFetch<unknown>(`/api/notes/${sourceId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notesQueryKey });
      router.push('/notes');
    },
  });

  if (detail.isError)
    return (
      <p role="alert">
        Could not load these notes.{' '}
        <button
          className="text-focus underline"
          onClick={() => void detail.refetch()}
        >
          Try again
        </button>
      </p>
    );
  if (!detail.data) return <p className="text-ink-2">Loading…</p>;
  const { source, cards, status } = detail.data;
  const visibleCards = cards.filter(
    (card) =>
      filter === 'all' ||
      (filter === 'approved'
        ? card.reviewStatus === 'approved'
        : card.reviewStatus !== 'approved'),
  );
  const chunkText = new Map(detail.data.chunks.map((c) => [c.id, c.text]));

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-ink">{source.title}</h1>
        {existing ? (
          <p className="text-sm text-ink-2">
            You had already uploaded these notes. Here are their cards.
          </p>
        ) : null}
      </div>

      <GenerationProgress
        status={status}
        onRetry={() => retry.mutate()}
        retrying={retry.isPending}
      />

      <p className="max-w-2xl text-sm text-ink-2">
        Check each card against the source before approving it. Draft and
        flagged cards stay out of study sessions. Source matching does not
        establish medical accuracy.
      </p>
      {notice && (
        <p role="status" className="text-sm text-focus">
          {notice}
        </p>
      )}
      <CardFilters
        cards={cards}
        value={filter}
        onChange={setFilter}
        disabled={editing !== null || update.isPending}
      />
      {update.isError || remove.isError || removeSource.isError ? (
        <p role="alert" className="text-warn">
          {(update.error ?? remove.error ?? removeSource.error)?.message ??
            'Could not save. Try again.'}
        </p>
      ) : null}
      <ol className="space-y-6">
        {visibleCards.map((card) =>
          editing === card.id ? (
            <li key={card.id} id={`card-${card.id}`} className="scroll-mt-20">
              <CardEditor
                card={card}
                sourceTitle={source.title}
                source={chunkText.get(card.chunkId)}
                busy={update.isPending}
                onSave={(body) => update.mutate({ cardId: card.id, ...body })}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={card.id}
              id={`card-${card.id}`}
              className="scroll-mt-20 rounded-xl border border-hairline bg-ground-2 p-5 sm:p-6"
            >
              <CardDetails
                card={card}
                sourceTitle={source.title}
                source={chunkText.get(card.chunkId) ?? ''}
                busy={update.isPending}
                onEdit={() => setEditing(card.id)}
                onStatus={(reviewStatus) =>
                  update.mutate({ cardId: card.id, reviewStatus })
                }
              />
              <details className="mt-3 text-sm">
                <summary className="min-h-11 cursor-pointer content-center text-muted">
                  More card actions
                </summary>
                <Button
                  variant="ghost"
                  onClick={() => remove.mutate(card.id)}
                  disabled={remove.isPending}
                >
                  Delete card
                </Button>
              </details>
              <span className="sr-only">
                {chunkText.has(card.chunkId) ? 'From your notes' : ''}
              </span>
            </li>
          ),
        )}
      </ol>

      {cards.length > 0 && visibleCards.length === 0 && (
        <p className="text-ink-2">
          {filter === 'approved'
            ? 'No approved cards yet. Check a card against its source, then approve it.'
            : 'All cards have been checked. You can start reviewing.'}
        </p>
      )}
      {status.finished && cards.length === 0 ? (
        <p className="text-ink-2">
          We could not find anything testable in these notes. Try a passage with
          definitions, causes, or numbers in it.
        </p>
      ) : null}

      <div className="pt-4">
        <Button
          variant="ghost"
          onClick={() => removeSource.mutate()}
          disabled={removeSource.isPending}
        >
          Delete these notes and their cards
        </Button>
      </div>
    </section>
  );
};

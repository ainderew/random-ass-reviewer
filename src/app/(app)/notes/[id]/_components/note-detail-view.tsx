'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type {
  Card,
  GenerationStatus,
  NoteDetail,
  UpdateCardRequest,
} from '@/domain/types';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { noteDetailKey, notesQueryKey } from '@/lib/query-keys';
import { CardEditor } from './card-editor';

const GenerationProgress = ({
  status,
  onRetry,
  retrying,
}: {
  status: GenerationStatus;
  onRetry: () => void;
  retrying: boolean;
}) => {
  const pct = status.totalChunks
    ? Math.round((status.processedChunks / status.totalChunks) * 100)
    : 100;
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-2 rounded-lg border border-hairline bg-ground-2 px-4 py-3"
    >
      <p className="text-sm text-ink">
        {status.finished
          ? `${status.cardsCreated} ${status.cardsCreated === 1 ? 'card' : 'cards'} from ${status.processedChunks} ${status.processedChunks === 1 ? 'section' : 'sections'}`
          : `Generating cards… ${status.processedChunks} of ${status.totalChunks} sections`}
      </p>
      {!status.finished ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-ground-3">
          <div
            className="h-full bg-focus transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {status.failedChunks > 0 ? (
        <p className="text-sm text-ink-2">
          {status.processedChunks - status.failedChunks} of {status.totalChunks}{' '}
          sections processed.
        </p>
      ) : null}
      {status.rejectedCards > 0 ? (
        <p className="text-xs text-muted">
          {status.rejectedCards} card{status.rejectedCards === 1 ? '' : 's'}{' '}
          dropped for not quoting the source.
        </p>
      ) : null}
      {status.message ? (
        <p className="text-sm text-warn">{status.message}</p>
      ) : null}
      {status.finished && status.failedChunks > 0 ? (
        <Button
          variant="ghost"
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying}
        >
          Try the failed sections again
        </Button>
      ) : null}
    </div>
  );
};

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
    onSuccess: () => {
      setEditing(null);
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

  if (!detail.data) return <p className="text-ink-2">Loading…</p>;
  const { source, cards, status } = detail.data;
  const chunkText = new Map(detail.data.chunks.map((c) => [c.id, c.text]));

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl text-ink">{source.title}</h1>
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

      <ol className="space-y-4">
        {cards.map((card) =>
          editing === card.id ? (
            <li key={card.id}>
              <CardEditor
                card={card}
                busy={update.isPending}
                onSave={(body) => update.mutate({ cardId: card.id, ...body })}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={card.id}
              className="space-y-2 rounded-lg border border-hairline p-4"
            >
              <p className="text-ink">{card.question}</p>
              <p className="text-insight">{card.answer}</p>
              {/* The quote is a trust feature, not debug output. Always shown. */}
              <blockquote className="border-l-0 text-sm leading-relaxed text-muted">
                “{card.sourceQuote}”
              </blockquote>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={() => setEditing(card.id)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => remove.mutate(card.id)}
                  disabled={remove.isPending}
                >
                  Delete
                </Button>
              </div>
              <span className="sr-only">
                {chunkText.has(card.chunkId) ? 'From your notes' : ''}
              </span>
            </li>
          ),
        )}
      </ol>

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

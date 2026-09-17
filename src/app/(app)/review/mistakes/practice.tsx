'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MistakeCheck, MistakeFeedback } from '@/domain/types/mistakes';
import { apiFetch, postJson } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
export const MistakePractice = () => {
  const client = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['mistake-checks'],
    queryFn: () => apiFetch<MistakeCheck[]>('/api/review/mistakes'),
    refetchOnWindowFocus: false,
  });
  const [held, setHeld] = useState<MistakeCheck | null>(null);
  const [feedback, setFeedback] = useState<MistakeFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<string | null>(null);
  const current = held ?? data?.find((q) => q.ready);
  async function answer(optionIndex: number) {
    if (!current || busy || feedback) return;
    setBusy(true);
    setHeld(current);
    setError(null);
    attempt.current ??= crypto.randomUUID();
    try {
      setFeedback(
        await postJson<MistakeFeedback>('/api/review/mistakes', {
          attemptId: attempt.current,
          sessionId: current.sessionId,
          cardId: current.cardId,
          optionIndex,
        }),
      );
      void client.invalidateQueries({ queryKey: ['today-plan'] });
    } catch {
      setError(
        'Could not save this check. Try again, or return to today to refresh your plan.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    setBusy(true);
    const result = await refetch();
    if (result.isError) setError('Could not load the next check. Try again.');
    else {
      setHeld(null);
      setFeedback(null);
      attempt.current = null;
      setError(null);
    }
    setBusy(false);
  }
  if (isPending) return <p role="status">Finding your delayed checks…</p>;
  if (isError && !held)
    return (
      <p role="alert">
        Checks could not load.{' '}
        <button className="underline" onClick={() => void refetch()}>
          Try again
        </button>
      </p>
    );
  if (!current)
    return (
      <div className="space-y-5 border-y border-hairline py-7">
        <h2 className="font-serif text-2xl">
          Nothing needs a check right now.
        </h2>
        <p className="text-ink-2">
          {data?.length
            ? 'Your remaining checks are scheduled for later. A gap makes the next attempt useful.'
            : 'Missed quiz questions return after 24 hours. A correct delayed check clears the follow-up.'}
        </p>
        <Link href="/study" className="journal-primary">
          Back to today <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  return (
    <section aria-label="Mistake follow-up" className="space-y-5">
      <p className="journal-label">Delayed practice / no repeat points</p>
      <h2 className="border-y border-hairline py-6 font-serif text-2xl leading-relaxed">
        {current.question}
      </h2>
      {!feedback ? (
        <div className="space-y-3">
          {current.options.map((option, i) => (
            <Button
              key={i}
              block
              variant="ghost"
              className="justify-start py-4 text-left"
              disabled={busy}
              onClick={() => void answer(i)}
            >
              <span className="mr-2 font-serif italic text-insight">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </Button>
          ))}
        </div>
      ) : (
        <div aria-live="polite" className="space-y-4">
          <h3 className="font-serif text-2xl text-focus">
            {feedback.correct
              ? 'Recalled after a gap.'
              : 'One more chance to learn it.'}
          </h3>
          <p className="font-medium">{feedback.correctAnswer}</p>
          <p>{feedback.explanation}</p>
          <blockquote className="border-l-2 border-insight/40 pl-4 text-sm text-ink-2">
            {feedback.sourceQuote}
          </blockquote>
          <p className="text-sm text-muted">
            {feedback.nextDueAt
              ? 'This question will return in 24 hours.'
              : 'Follow-up cleared. Your regular flashcard schedule continues.'}
          </p>
          <Button block onClick={() => void next()} disabled={busy}>
            Continue
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-warn">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-5">
        <Link
          className="inline-flex min-h-11 items-center text-sm text-focus underline"
          href={`/notes/${current.sourceId}`}
        >
          Check source and card
        </Link>
        <Link
          className="inline-flex min-h-11 items-center text-sm text-focus underline"
          href="/study"
        >
          Back to today
        </Link>
      </div>
    </section>
  );
};

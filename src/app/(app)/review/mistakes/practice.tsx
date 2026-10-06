'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MistakeCheck, MistakeFeedback } from '@/domain/types/mistakes';
import { apiFetch, postJson } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  AnswerVerdict,
  ChoiceButton,
  choiceState,
  useAnswerCue,
} from '@/components/study/answer-feedback';
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
  const [picked, setPicked] = useState<number | null>(null);
  const cue = useAnswerCue();
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<string | null>(null);
  const current = held ?? data?.find((q) => q.ready);
  async function answer(optionIndex: number) {
    if (!current || busy || feedback) return;
    setBusy(true);
    setHeld(current);
    setPicked(optionIndex);
    setError(null);
    attempt.current ??= crypto.randomUUID();
    try {
      const result = await postJson<MistakeFeedback>('/api/review/mistakes', {
        attemptId: attempt.current,
        sessionId: current.sessionId,
        cardId: current.cardId,
        optionIndex,
      });
      setFeedback(result);
      cue(result.correct);
      void client.invalidateQueries({ queryKey: ['today-plan'] });
    } catch {
      setPicked(null);
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
      setPicked(null);
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
      <div className="space-y-2.5">
        {current.options.map((option, i) => (
          <ChoiceButton
            key={i}
            index={i}
            state={choiceState({
              index: i,
              picked,
              correct: feedback
                ? current.options.indexOf(feedback.correctAnswer)
                : null,
            })}
            disabled={busy || !!feedback}
            onPick={() => void answer(i)}
          >
            {option}
          </ChoiceButton>
        ))}
      </div>
      {feedback && (
        <div className="space-y-4">
          <AnswerVerdict correct={feedback.correct}>
            <p className="text-ink-2">
              {feedback.correct
                ? 'Remembered after a gap. The follow-up is cleared.'
                : 'It comes back in 24 hours for another try.'}
            </p>
            {feedback.explanation && (
              <p className="text-ink-2">{feedback.explanation}</p>
            )}
            <blockquote className="border-l-2 border-hairline pl-3 text-sm text-ink-2">
              {feedback.sourceQuote}
            </blockquote>
          </AnswerVerdict>
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

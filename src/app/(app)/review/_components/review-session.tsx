'use client';

import Link from 'next/link';
import { reviewBatch, type StudyBudget } from '@/domain/review/today';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { MedtechSubject } from '@/domain/study/medtech';
import type { QueuedCard, Rating } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { playPitched } from '@/game/systems/juice/play-pitched';
import { reviewQueueKey } from '@/lib/query-keys';
import { useReviewQueue, useReviewStats } from '../_hooks/use-review';
import { useAnswerQueue } from '../_hooks/use-answer-queue';
import { Flashcard } from './flashcard';
import { RatingButtons } from './rating-buttons';
import {
  recommendedAnswerType,
  hasChoices,
  type AnswerType,
} from '@/domain/review/regimen';
import { PracticePrompt } from './practice-prompt';
import { ReviewComplete } from './review-complete';
import { AnswerTypePicker } from './answer-type-picker';
import { MakeChoices } from './make-choices';

// A radio or checkbox holds focus without taking text, so shortcuts still work.
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  ((target instanceof HTMLInputElement &&
    target.type !== 'radio' &&
    target.type !== 'checkbox') ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable);

// Space reveals, 1 to 4 rate. Serious users review hundreds of cards and will
// not click through them, so the keyboard is the primary interface and the
// shortcuts stay on screen. A failed save is queued; the student keeps moving.
export const ReviewSession = ({
  minutes = null,
  subject,
}: {
  minutes?: StudyBudget | null;
  // One MTLE subject's cards; everything due when absent.
  subject?: MedtechSubject;
}) => {
  const queryClient = useQueryClient();
  const {
    data: queue,
    isPending,
    isError: queueError,
    refetch,
  } = useReviewQueue(subject);
  const { data: stats } = useReviewStats();
  const [selection, setSelection] = useState<AnswerType>('auto');
  const [choiceCorrect, setChoiceCorrect] = useState<boolean | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>();
  const [choiceScore, setChoiceScore] = useState({ correct: 0, total: 0 });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(0);
  const [bestRun, setBestRun] = useState(0);

  const [error, setError] = useState<string | null>(null);
  // The card whose choices were just written here, to say so under them.
  const [madeChoicesFor, setMadeChoicesFor] = useState<string | null>(null);
  const shownAt = useRef(0);

  const answers = useAnswerQueue(() => {});

  const cards: QueuedCard[] = (
    minutes ? reviewBatch(queue ?? [], minutes) : (queue ?? [])
  ).filter((c) => !skipped.has(c.id));
  const card = cards[index];
  const suggested = card ? recommendedAnswerType(card) : 'recall';
  const mode = selection === 'auto' ? suggested : selection;
  const cardHasChoices = !!card && hasChoices(card);
  const done = !isPending && card === undefined;

  useEffect(() => {
    shownAt.current = performance.now();
  }, [card?.id]);

  const advance = (rating: Rating) => {
    const nextRun = rating === 1 ? 0 : run + 1;
    setRun(nextRun);
    setBestRun((b) => Math.max(b, nextRun));
    // One semitone per consecutive success, capped inside playPitched.
    if (nextRun > 0) playPitched({ frequency: 523.25, semitones: nextRun - 1 });
    if (mode === 'choice' && choiceCorrect !== null)
      setChoiceScore((s) => ({
        correct: s.correct + Number(choiceCorrect),
        total: s.total + 1,
      }));
    setChoiceCorrect(null);
    setSelectedAnswer(undefined);
    setSelection('auto');
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const rate = async (rating: Rating) => {
    if (
      !card ||
      busy ||
      !revealed ||
      (mode === 'choice' && choiceCorrect === false && rating !== 1)
    )
      return;
    setError(null);
    setBusy(true);
    const elapsedMs = Math.max(
      0,
      Math.round(performance.now() - shownAt.current),
    );
    try {
      const outcome = await answers.submit({
        cardId: card.id,
        rating,
        elapsedMs,
        practiceType: mode,
        ...(mode === 'choice' ? { selectedAnswer } : {}),
      });

      if (outcome.kind === 'gone') {
        // Deleted mid-review. Drop it and move on without ceremony.
        setSkipped((s) => new Set(s).add(card.id));
        setSelection('auto');
        setChoiceCorrect(null);
        setSelectedAnswer(undefined);
        setRevealed(false);
        return;
      }
      if (outcome.kind === 'overflow') {
        setError(
          'Too many answers are waiting to save. Check your connection before going on.',
        );
        return;
      }
      advance(rating);
    } catch {
      setError('Could not save that rating. Your place is kept; try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        isTyping(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.key === ' ' || event.key === 'Spacebar') {
        if (
          event.target instanceof Element &&
          event.target.closest('summary, button, a, [role="button"]')
        )
          return;
        if (mode === 'choice') return;
        event.preventDefault();
        if (card && !revealed) {
          setRevealed(true);
        }
        return;
      }
      if (!revealed) return;
      const rating = Number(event.key);
      if (rating >= 1 && rating <= 4) {
        event.preventDefault();
        void rate(rating as Rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (isPending) return <p className="text-ink-2">Loading your deck…</p>;

  if (queueError)
    return (
      <p role="alert">
        Your cards could not load.{' '}
        <button className="underline" onClick={() => void refetch()}>
          Try again
        </button>
      </p>
    );

  if (done) {
    return (
      <div className="space-y-6">
        {choiceScore.total > 0 && (
          <p role="status" className="answer-section">
            {choiceScore.correct} of {choiceScore.total} correct on the first
            choice. This is practice with your notes, not a board-exam readiness
            score.
          </p>
        )}
        <ReviewComplete
          reviewed={index}
          bounded={minutes !== null}

          bestRun={bestRun}
          totalCards={stats?.totals.total ?? null}
          nextDueAt={stats?.nextDueAt ?? null}
          onAgain={() => {
            if (answers.pending > 0) return;
            setIndex(0);
            setChoiceScore({ correct: 0, total: 0 });
            setRun(0);

            void queryClient.invalidateQueries({ queryKey: reviewQueueKey });
          }}
        />
        {answers.pending > 0 ? (
          <p role="status">
            {answers.pending} answers waiting to save. Keep this page open until
            they are saved.
          </p>
        ) : (
          <>
            <Link href="/review/mistakes" className="journal-primary">
              Check for a mistake follow-up <span aria-hidden="true">→</span>
            </Link>
            <div className="flex flex-wrap gap-x-6">
              <Link
                href="/review"
                className="inline-flex min-h-11 items-center text-focus underline"
              >
                Pick another subject
              </Link>
              <Link
                href="/study"
                className="inline-flex min-h-11 items-center text-focus underline"
              >
                Back to today
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Review" className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <p className="text-ink-2">
          Card {index + 1} of {cards.length}
        </p>
      </div>
      <details className="text-sm text-muted">
        <summary className="min-h-11 cursor-pointer content-center">
          Answer mode
        </summary>
        <AnswerTypePicker
          mode={mode}
          suggested={suggested}
          hasChoices={cardHasChoices}
          locked={revealed || busy}
          onSelect={setSelection}
        />
      </details>

      {card ? (
        <Flashcard card={card} revealed={revealed}>
          {mode === 'choice' && !cardHasChoices ? (
            <MakeChoices
              card={card}
              onMade={() => setMadeChoicesFor(card.id)}
            />
          ) : mode !== 'recall' ? (
            <>
              <PracticePrompt
                key={`${card.id}:${mode}`}
                card={card}
                mode={mode}
                revealed={revealed}
                onChoice={(correct, selected) => {
                  setSelectedAnswer(selected);
                  setChoiceCorrect(correct);
                  setRevealed(true);
                }}
              />
              {mode === 'choice' && madeChoicesFor === card.id && (
                <p className="mt-3 text-xs text-muted">
                  Choices written by AI from your notes. Fix any of them in the
                  card editor.
                </p>
              )}
            </>
          ) : null}
        </Flashcard>
      ) : null}

      {card && !revealed && mode !== 'choice' ? (
        <Button
          size="lg"
          block
          onClick={() => {
            setRevealed(true);
          }}
          aria-keyshortcuts="Space"
        >
          Show answer <kbd className="ml-2 hidden text-xs sm:inline">Space</kbd>
        </Button>
      ) : null}
      {card && revealed ? (
        <div className="space-y-3">
          {mode === 'choice' && choiceCorrect === false ? (
            <Button
              block
              size="lg"
              disabled={busy}
              onClick={() => void rate(1)}
            >
              Try again later
            </Button>
          ) : (
            <RatingButtons
              card={card}
              disabled={busy}
              onRate={(r) => void rate(r)}
            />
          )}
        </div>
      ) : null}

      {answers.pending > 0 ? (
        <p role="status" className="text-xs text-muted">
          {answers.pending} {answers.pending === 1 ? 'answer' : 'answers'}{' '}
          waiting to save.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      ) : null}
    </section>
  );
};

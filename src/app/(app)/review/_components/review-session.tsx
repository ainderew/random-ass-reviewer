'use client';

import Link from 'next/link';
import { reviewBatch, type StudyBudget } from '@/domain/review/today';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueuedCard, Rating } from '@/domain/types';
import { DiamondGlyph } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { playPitched } from '@/game/systems/juice/play-pitched';
import { useSpringPop } from '@/game/systems/juice/use-spring-pop';
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
import { PracticePrompt, PRACTICE_MODES } from './practice-prompt';
import { ReviewComplete } from './review-complete';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable);

// Space reveals, 1 to 4 rate. Serious users review hundreds of cards and will
// not click through them, so the keyboard is the primary interface and the
// shortcuts stay on screen. A failed save is queued; the student keeps moving.
export const ReviewSession = ({
  minutes = null,
}: {
  minutes?: StudyBudget | null;
}) => {
  const queryClient = useQueryClient();
  const {
    data: queue,
    isPending,
    isError: queueError,
    refetch,
  } = useReviewQueue();
  const { data: stats } = useReviewStats();
  const pop = useSpringPop();
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
  const [insight, setInsight] = useState(0);
  const [lastAward, setLastAward] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(0);

  const credit = useCallback((amount: number) => {
    setInsight((total) => total + amount);
    setLastAward(amount);
  }, []);
  const answers = useAnswerQueue((result) => credit(result.insightAwarded));

  const cards: QueuedCard[] = (
    minutes ? reviewBatch(queue ?? [], minutes) : (queue ?? [])
  ).filter((c) => !skipped.has(c.id));
  const card = cards[index];
  const mode =
    selection === 'auto'
      ? card
        ? recommendedAnswerType(card)
        : 'recall'
      : selection;
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
      if (outcome.kind === 'ok') credit(outcome.result.insightAwarded);
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
          insight={insight}
          bestRun={bestRun}
          totalCards={stats?.totals.total ?? null}
          nextDueAt={stats?.nextDueAt ?? null}
          onAgain={() => {
            if (answers.pending > 0) return;
            setIndex(0);
            setChoiceScore({ correct: 0, total: 0 });
            setRun(0);
            setInsight(0);
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
            <Link
              href="/study"
              className="inline-flex min-h-11 items-center text-focus underline"
            >
              Back to today
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Review" className="space-y-5">
      <div className="space-y-2 border-b border-hairline pb-5">
        <label htmlFor="practice-mode" className="card-section-label">
          Answer type for this card
        </label>
        <select
          id="practice-mode"
          className="study-field"
          value={selection}
          disabled={revealed || busy}
          onChange={(e) => setSelection(e.target.value as AnswerType)}
        >
          <option value="auto">Follow my regimen (recommended)</option>
          {Object.entries(PRACTICE_MODES).map(([key, value]) => (
            <option
              key={key}
              value={key}
              disabled={key === 'choice' && !!card && !hasChoices(card)}
            >
              {value.title}
            </option>
          ))}
        </select>
        <p className="text-sm text-ink-2">{PRACTICE_MODES[mode].hint}</p>
        <p className="text-xs text-muted">
          {selection === 'auto'
            ? `Selected for you: ${PRACTICE_MODES[mode].title}.`
            : 'This change applies to this review only.'}{' '}
          You can change the type before answering.
        </p>
        {card && !hasChoices(card) && (
          <p className="text-xs text-muted">
            To enable multiple choice, add alternatives and explanations in this
            card&apos;s notes.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <p className="font-mono text-ink-2 tabular-nums">
          Card {index + 1} of {cards.length}
        </p>
        <p
          key={lastAward === null ? 'none' : `${index}-${lastAward}`}
          className={`flex items-center gap-1 font-mono text-insight tabular-nums ${lastAward ? pop.className : ''}`}
          aria-live="polite"
        >
          <DiamondGlyph size={14} />+{insight}
          {run >= 2 ? (
            <span className="ml-2 text-muted">{run} in a row</span>
          ) : null}
        </p>
      </div>

      {card ? (
        <Flashcard card={card} revealed={revealed}>
          {mode !== 'recall' && (
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
          )}
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
          <h2 className="text-base font-semibold">
            How well did you remember?
          </h2>
          {mode === 'choice' && choiceCorrect === false ? (
            <Button
              block
              size="lg"
              disabled={busy}
              onClick={() => void rate(1)}
            >
              Again · review this sooner
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
      <p className="text-xs text-muted">
        Again earns the same review credit as Good. Rate what you remembered.
      </p>
      <p className="hidden text-xs text-muted sm:block">
        {mode === 'choice'
          ? 'Choose an option, then rate your recall.'
          : 'Space to reveal, 1 to 4 to rate.'}
      </p>
    </section>
  );
};

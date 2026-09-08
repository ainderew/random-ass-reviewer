'use client';

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
import { ReviewComplete } from './review-complete';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable);

// Space reveals, 1 to 4 rate. Serious users review hundreds of cards and will
// not click through them, so the keyboard is the primary interface and the
// shortcuts stay on screen. A failed save is queued; the student keeps moving.
export const ReviewSession = () => {
  const queryClient = useQueryClient();
  const { data: queue, isPending } = useReviewQueue();
  const { data: stats } = useReviewStats();
  const pop = useSpringPop();
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

  const cards: QueuedCard[] = (queue ?? []).filter((c) => !skipped.has(c.id));
  const card = cards[index];
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
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const rate = async (rating: Rating) => {
    if (!card || busy) return;
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
      });
      if (outcome.kind === 'ok') credit(outcome.result.insightAwarded);
      if (outcome.kind === 'gone') {
        // Deleted mid-review. Drop it and move on without ceremony.
        setSkipped((s) => new Set(s).add(card.id));
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
        event.preventDefault();
        if (card && !revealed) setRevealed(true);
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

  if (done) {
    return (
      <ReviewComplete
        reviewed={index}
        insight={insight}
        bestRun={bestRun}
        totalCards={stats?.totals.total ?? null}
        nextDueAt={stats?.nextDueAt ?? null}
        onAgain={() => {
          setIndex(0);
          setRun(0);
          setInsight(0);
          void queryClient.invalidateQueries({ queryKey: reviewQueueKey });
        }}
      />
    );
  }

  return (
    <section aria-label="Review" className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <p className="font-mono text-ink-2 tabular-nums">
          {index + 1} / {cards.length}
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

      {card ? <Flashcard card={card} revealed={revealed} /> : null}

      {card && !revealed ? (
        <Button
          size="lg"
          block
          onClick={() => setRevealed(true)}
          aria-keyshortcuts="Space"
        >
          Show answer{' '}
          <span className="ml-2 font-mono text-xs opacity-70">Space</span>
        </Button>
      ) : null}
      {card && revealed ? (
        <RatingButtons
          card={card}
          disabled={busy}
          onRate={(r) => void rate(r)}
        />
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
      <p className="text-xs text-muted">Space to reveal, 1 to 4 to rate.</p>
    </section>
  );
};

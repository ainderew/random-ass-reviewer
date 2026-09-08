'use client';

import { useState, type ReactNode } from 'react';
import type {
  QuizResult,
  SessionResult as SessionResultData,
} from '@/domain/types';
import { BoltGlyph } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { formatMinutes } from '@/lib/format-time';
import { useCountUp } from '../_hooks/use-count-up';
import { CacheReveal } from './cache-reveal';
import { LevelUpBanner } from './level-up-banner';
import { StreakNotice } from './streak-notice';
import { TimerFrame } from './timer-frame';

function creditedLine(result: SessionResultData): string {
  if (result.cappedByDailyLimit) {
    return `${formatMinutes(result.creditedMs)} credited of ${formatMinutes(result.focusedMs)} focused`;
  }
  return `${formatMinutes(result.creditedMs)} credited`;
}

// The one loud moment. Summary first, then the chest, then the level-up and
// streak beats in that order. Two celebrations at once cancel each other.
export const SessionResult = ({
  result,
  quiz = null,
  onDone,
  children,
}: {
  result: SessionResultData;
  quiz?: QuizResult | null;
  onDone: () => void;
  children?: ReactNode;
}) => {
  const focus = useCountUp(result.focusAwarded);
  const [revealDone, setRevealDone] = useState(result.cache === null);
  const afterReveal = revealDone;

  return (
    <TimerFrame
      label="Session result"
      actions={
        <Button onClick={onDone} size="lg" block>
          Start another
        </Button>
      }
    >
      <div className="rise-in space-y-8">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl leading-tight tracking-[-0.01em] text-ink">
            Session saved
          </h1>
          <p className="text-lg text-ink-2">{creditedLine(result)}</p>
        </div>

        <div className="relative">
          {result.focusAwarded > 0 ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-8 -inset-y-10 rounded-full bg-[radial-gradient(closest-side,rgba(232,176,75,0.16),transparent)]"
            />
          ) : null}
          <p className="relative flex items-center gap-3 font-mono text-5xl font-medium tracking-[-0.02em] text-focus tabular-nums">
            <BoltGlyph size={30} />
            <span>
              +{focus.toLocaleString()} <span className="text-2xl">Focus</span>
            </span>
          </p>
          <p className="relative mt-2 text-lg text-ink-2">
            +{result.xpAwarded.toLocaleString()} XP
            {result.quizMultiplier > 1 ? (
              <span className="ml-3 font-mono text-focus tabular-nums">
                ×{result.quizMultiplier.toFixed(2)} quiz bonus
              </span>
            ) : null}
          </p>
          {quiz && quiz.insightAwarded > 0 ? (
            <p className="relative mt-1 text-lg text-insight">
              +{quiz.insightAwarded} Insight from the quiz
            </p>
          ) : null}
        </div>

        {result.belowMinimum ? (
          <p className="max-w-[40ch] leading-relaxed text-ink-2">
            Under 5 minutes does not earn Focus yet. It still counts as showing
            up.
          </p>
        ) : null}
        {result.cappedByDailyLimit ? (
          <p className="max-w-[40ch] leading-relaxed text-ink-2">
            Daily cap reached. Nice work today.
          </p>
        ) : null}

        {result.cache ? (
          <CacheReveal
            cacheId={result.cache.id}
            onDone={() => setRevealDone(true)}
          />
        ) : null}

        {afterReveal && result.levelUp ? (
          <LevelUpBanner levelUp={result.levelUp} />
        ) : null}
        {afterReveal && result.streak ? (
          <StreakNotice streak={result.streak} />
        ) : null}

        {children}
      </div>
    </TimerFrame>
  );
};

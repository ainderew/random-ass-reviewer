'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SessionResult as SessionResultData } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { formatMinutes } from '@/lib/format-time';
import type { Milestone } from '@/domain/career/milestones';
import { MilestoneReveal } from './milestone-reveal';
import { StreakNotice } from './streak-notice';
import { TimerFrame } from './timer-frame';

function creditedLine(result: SessionResultData): string {
  if (result.cappedByDailyLimit) {
    return `${formatMinutes(result.creditedMs)} credited of ${formatMinutes(result.focusedMs)} focused`;
  }
  return `${formatMinutes(result.creditedMs)} credited`;
}

export const SessionResult = ({
  result,
  milestones = [],
  onDone,
  children,
}: {
  result: SessionResultData;
  milestones?: Milestone[];
  onDone: () => void;
  children?: ReactNode;
}) => {
  return (
    <TimerFrame
      label="Session result"
      actions={
        <div className="grid gap-2">
          <Link
            href="/study"
            className="flex min-h-14 items-center justify-center rounded-lg bg-focus text-base font-medium text-white hover:bg-focus-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Back to today
          </Link>
          <Button onClick={onDone} size="lg" block variant="ghost">
            Start another
          </Button>
        </div>
      }
    >
      <div className="rise-in space-y-8">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl leading-tight tracking-[-0.01em] text-ink">
            Session saved
          </h1>
          <p className="text-lg text-ink-2">{creditedLine(result)}</p>
        </div>

        {result.pet && result.pet.bowlsFilled > 0 ? (
          <p className="text-lg text-ink-2">
            {result.pet.bowlsFilled}{' '}
            {result.pet.bowlsFilled === 1 ? 'bowl' : 'bowls'} of kibble for{' '}
            {result.pet.name}
          </p>
        ) : null}
        {result.belowMinimum ? (
          <p className="max-w-[40ch] leading-relaxed text-ink-2">
            A short session, saved. Five minutes counts toward your streak.
          </p>
        ) : null}
        {result.cappedByDailyLimit ? (
          <p className="max-w-[40ch] leading-relaxed text-ink-2">
            Daily cap reached. Nice work today.
          </p>
        ) : null}

        {result.streak ? <StreakNotice streak={result.streak} /> : null}
        <MilestoneReveal milestones={milestones} />

        {children}
      </div>
    </TimerFrame>
  );
};

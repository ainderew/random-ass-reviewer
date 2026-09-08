import Link from 'next/link';
import { OnboardingSteps } from '@/app/(app)/_components/onboarding-steps';
import type { Aim } from '@/domain/island/aim';
import type { SessionLength } from '@/domain/session/rungs';
import { Button } from '@/components/ui/button';
import { AimLine } from './aim-line';
import { LengthPicker } from './length-picker';
import { TimerFrame } from './timer-frame';
import { TodayLanterns } from './today-lanterns';
import { WeeklySummaryCard } from './weekly-summary';

export const IdleView = ({
  creditedTodayMs,
  todaySessions,
  streakDays,
  firstVisit = false,
  focusBalance,
  level,
  aim,
  onAimChange,
  length,
  onLengthChange,
  starting,
  error,
  onStart,
}: {
  creditedTodayMs: number;
  todaySessions: Array<{ creditedMs: number }>;
  streakDays: number;
  firstVisit?: boolean;
  focusBalance: number;
  level: number;
  aim: Aim | null;
  onAimChange: (assetId: string) => void;
  length: SessionLength;
  onLengthChange: (length: SessionLength) => void;
  starting: boolean;
  error: string | null;
  onStart: () => void;
}) => (
  <TimerFrame
    label="Start a focus session"
    actions={
      <>
        {error ? (
          <p
            role="status"
            className="text-[0.9375rem] leading-relaxed text-warn"
          >
            {error}
          </p>
        ) : null}
        <Button
          onClick={onStart}
          disabled={starting}
          aria-busy={starting}
          size="lg"
          block
        >
          {starting ? 'Starting…' : 'Start focusing'}
        </Button>
      </>
    }
  >
    <div className="space-y-6">
      <WeeklySummaryCard />
      <OnboardingSteps />
      <h1 className="font-serif text-4xl leading-tight tracking-[-0.01em] text-ink md:text-5xl">
        {firstVisit ? 'Your first session.' : 'Ready when you are.'}
      </h1>
      {firstVisit ? (
        <p className="max-w-[40ch] text-lg leading-relaxed text-ink-2">
          Start the timer and study anything. Stay on this tab and every minute
          pays ten Focus. Five minutes is enough for the first reward.{' '}
          <Link
            href="/how-it-works"
            className="text-focus underline underline-offset-4"
          >
            How rewards work
          </Link>
        </p>
      ) : null}
      <AimLine
        aim={aim}
        focusBalance={focusBalance}
        level={level}
        onChange={onAimChange}
      />
      <LengthPicker value={length} onChange={onLengthChange} />
      {todaySessions.length > 0 ? (
        <TodayLanterns sessions={todaySessions} creditedMs={creditedTodayMs} />
      ) : streakDays > 0 && !firstVisit ? (
        <p className="text-sm text-muted">
          {streakDays}-day streak. Nothing credited yet today.
        </p>
      ) : null}
    </div>
  </TimerFrame>
);

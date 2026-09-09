import Link from 'next/link';
import { OnboardingSteps } from '@/app/(app)/_components/onboarding-steps';
import type { CareerProgress } from '@/domain/career/milestones';
import type { Aim } from '@/domain/island/aim';
import type { SessionLength } from '@/domain/session/rungs';
import { Button } from '@/components/ui/button';
import { formatClock } from '@/lib/format-time';
import { AimLine } from './aim-line';
import { CareerNext } from './career-next';
import { FocusCircle } from './focus-circle';
import { LengthPicker } from './length-picker';
import { TimerFrame } from './timer-frame';
import { TodayLanterns } from './today-lanterns';
import { WeeklySummaryCard } from './weekly-summary';

// One shape, one number, one button. She moves around the room she has
// earned while you decide; the ring shows the rungs the chosen length will
// pass. Everything smaller sits under the button.
export const IdleView = ({
  creditedTodayMs,
  todaySessions,
  career,
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
  career: CareerProgress;
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
    below={
      <>
        <WeeklySummaryCard />
        {todaySessions.length > 0 ? (
          <TodayLanterns
            sessions={todaySessions}
            creditedMs={creditedTodayMs}
          />
        ) : streakDays > 0 && !firstVisit ? (
          <p className="text-sm text-muted">
            {streakDays}-day streak. Nothing credited yet today.
          </p>
        ) : null}
        <CareerNext progress={career} />
      </>
    }
  >
    <div className="flex flex-col items-center gap-6 text-center">
      <OnboardingSteps />
      <h1 className="font-serif text-3xl leading-tight tracking-[-0.01em] text-ink md:text-4xl">
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
      <FocusCircle
        progress={career}
        mood="wandering"
        lengthMs={length === null ? null : length * 60_000}
      />
      <div className="rounded-full border border-hairline px-4 py-1.5">
        <AimLine
          aim={aim}
          focusBalance={focusBalance}
          level={level}
          onChange={onAimChange}
        />
      </div>
      <p
        className="font-mono text-[clamp(3.25rem,16vw,5.25rem)] leading-none font-medium tracking-[-0.03em] text-ink tabular-nums"
        aria-label="Session length"
      >
        {length === null ? (
          <span className="font-serif text-4xl font-normal tracking-normal md:text-5xl">
            Open
          </span>
        ) : (
          formatClock(length * 60_000)
        )}
      </p>
      <div className="flex justify-center">
        <LengthPicker value={length} onChange={onLengthChange} />
      </div>
    </div>
  </TimerFrame>
);

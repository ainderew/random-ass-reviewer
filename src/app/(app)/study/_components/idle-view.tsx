import Link from 'next/link';
import { OnboardingSteps } from '@/app/(app)/_components/onboarding-steps';
import { Button } from '@/components/ui/button';
import { formatMinutes } from '@/lib/format-time';
import { TimerFrame } from './timer-frame';
import { WeeklySummaryCard } from './weekly-summary';

function todayLine(creditedTodayMs: number, streakDays: number): string {
  const credited =
    creditedTodayMs >= 60_000
      ? `${formatMinutes(creditedTodayMs)} credited today`
      : 'Nothing credited yet today';
  const streak =
    streakDays > 0
      ? `${streakDays}-day streak`
      : 'A streak starts with one session';
  return `${credited}. ${streak}.`;
}

export const IdleView = ({
  creditedTodayMs,
  streakDays,
  firstVisit = false,
  starting,
  error,
  onStart,
}: {
  creditedTodayMs: number;
  streakDays: number;
  firstVisit?: boolean;
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
      ) : (
        <p className="max-w-[40ch] text-lg leading-relaxed text-ink-2">
          {todayLine(creditedTodayMs, streakDays)}
        </p>
      )}
    </div>
  </TimerFrame>
);

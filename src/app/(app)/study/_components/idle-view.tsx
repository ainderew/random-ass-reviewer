import Link from 'next/link';
import { OnboardingSteps } from '@/app/(app)/_components/onboarding-steps';
import type { CareerProgress } from '@/domain/career/milestones';
import type { Aim } from '@/domain/island/aim';
import type { SessionLength } from '@/domain/session/rungs';
import type { StudyBudget } from '@/domain/review/today';
import { Button } from '@/components/ui/button';
import { formatClock } from '@/lib/format-time';
import { AimLine } from './aim-line';
import { CareerNext } from './career-next';
import { CoastalHero } from '@/components/coastal-hero';
import { LengthPicker } from './length-picker';
import { TodayLanterns } from './today-lanterns';
import { WeeklySummaryCard } from './weekly-summary';
import { TodayPlan } from './today-plan';

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
  onRead,
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
  onRead: (minutes: StudyBudget) => void;
}) => (
  <div className="space-y-8">
    <CoastalHero />
    {error && (
      <p role="alert" className="text-warn">
        {error}
      </p>
    )}
    <div className="grid items-start gap-9 md:grid-cols-[1.4fr_1fr] lg:gap-14">
      <TodayPlan onRead={onRead} starting={starting} />
      <aside className="space-y-7 md:border-l md:border-hairline md:pl-8">
        <section
          aria-label="Your island goal"
          className="border-y border-hairline py-5"
        >
          <Link
            href="/island"
            className="my-3 flex min-h-11 items-center justify-between font-serif text-3xl text-focus"
          >
            Your island project <span aria-hidden="true">↗</span>
          </Link>
          <AimLine
            aim={aim}
            focusBalance={focusBalance}
            level={level}
            onChange={onAimChange}
          />
          <div className="mt-5 border-t border-hairline pt-5">
            <CareerNext progress={career} />
          </div>
        </section>
        <section aria-label="Start a focus session" className="space-y-4">
          <div>
            <h2 className="mt-2 font-serif text-2xl">Focus session</h2>
            <p className="mt-1 text-sm text-ink-2">
              {firstVisit
                ? 'Your first session. Start small.'
                : 'Keep Aloft visible while you study.'}
            </p>
          </div>
          <p
            className="font-serif text-5xl tabular-nums"
            aria-label="Session length"
          >
            {length === null ? 'Open' : formatClock(length * 60_000)}
          </p>
          <LengthPicker value={length} onChange={onLengthChange} />
          <Button
            onClick={onStart}
            disabled={starting}
            aria-busy={starting}
            block
            variant="ghost"
          >
            {starting ? 'Starting…' : 'Start focusing'}
          </Button>
          <p className="text-xs text-muted">
            Visible, focused time earns Focus after 5 minutes.{' '}
            <Link href="/how-it-works" className="underline">
              How it works
            </Link>
          </p>
        </section>
        <Link
          href="/notes"
          className="flex min-h-14 items-center justify-between border-y border-hairline py-3 text-focus"
        >
          Your notes &amp; sources <span aria-hidden="true">↗</span>
        </Link>
      </aside>
    </div>
    <OnboardingSteps />
    <WeeklySummaryCard />
    {todaySessions.length > 0 ? (
      <div className="border-t border-hairline py-5">
        <TodayLanterns sessions={todaySessions} creditedMs={creditedTodayMs} />
      </div>
    ) : streakDays > 0 && !firstVisit ? (
      <p className="text-sm text-muted">
        Your previous streak: {streakDays} days. Today can start with one small
        step.
      </p>
    ) : null}
  </div>
);

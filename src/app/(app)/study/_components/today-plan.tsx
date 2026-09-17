'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  STUDY_BUDGETS,
  type StudyBudget,
  type TodayPlan as Plan,
} from '@/domain/review/today';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export const TodayPlan = ({
  onRead,
  starting,
}: {
  onRead: (minutes: StudyBudget) => void;
  starting: boolean;
}) => {
  const [minutes, setMinutes] = useState<StudyBudget>(15);
  const { data, isError, refetch } = useQuery({
    queryKey: ['today-plan'],
    queryFn: () => apiFetch<Plan>('/api/study-plan/today'),
  });
  const batch = data?.batches[minutes];
  return (
    <section aria-label="Today's study plan" className="journal-plan">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl">A little progress today</h2>
        <span className="journal-label">Your itinerary</span>
      </div>
      <fieldset className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <legend className="sr-only">Time for this review</legend>
        <span className="text-sm text-ink-2">Make room for</span>
        <div className="flex gap-1 rounded-lg border border-hairline p-1">
          {STUDY_BUDGETS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={minutes === n}
              onClick={() => setMinutes(n)}
              className={`min-h-11 min-w-16 rounded-md px-3 text-sm ${minutes === n ? 'bg-focus text-ground' : 'text-ink-2 hover:bg-ground-3'}`}
            >
              {n} min
            </button>
          ))}
        </div>
      </fieldset>
      {!data ? (
        <div role="status" className="py-8 text-ink-2">
          {isError ? (
            <>
              Your plan could not load.{' '}
              <button className="underline" onClick={() => void refetch()}>
                Try again
              </button>
            </>
          ) : (
            'Finding your next small step…'
          )}
        </div>
      ) : (
        <>
          <ol className="mt-5 divide-y divide-hairline border-y border-hairline">
            <li className="journal-step">
              <span className="journal-number">01</span>
              <div>
                <h3 className="font-serif text-2xl">
                  {batch?.total
                    ? 'Recall what is ready'
                    : data.approved
                      ? 'Room to breathe'
                      : 'Begin with your notes'}
                </h3>
                <p className="mt-1 text-sm text-ink-2">
                  {batch?.total
                    ? `${batch.returning} returning + ${batch.fresh} new cards. Recall first, then reveal.`
                    : data.approved
                      ? 'No cards available in this batch. Come back when the next review is due.'
                      : 'Upload your notes, then check and approve the generated cards.'}
                </p>
              </div>
            </li>
            <li className="journal-step">
              <span className="journal-number">02</span>
              <div>
                <h3 className="font-serif text-2xl">Revisit a mistake</h3>
                <p className="mt-1 text-sm text-ink-2">
                  {data.mistakesDue
                    ? `${data.mistakesDue} delayed ${data.mistakesDue === 1 ? 'check is' : 'checks are'} ready. Try one after your cards.`
                    : data.nextMistakeAt
                      ? 'Your next check is scheduled for later. Spacing gives recall a chance.'
                      : 'A missed quiz question will return here after a day.'}
                </p>
                {data.mistakesDue > 0 && (
                  <Link
                    className="mt-2 inline-flex min-h-11 items-center text-sm text-focus underline underline-offset-4"
                    href="/review/mistakes"
                  >
                    Try a delayed check ↗
                  </Link>
                )}
              </div>
            </li>
          </ol>
          <Link
            className="journal-primary mt-5"
            href={
              batch?.total
                ? `/review?minutes=${minutes}`
                : data.approved
                  ? '/review'
                  : '/notes'
            }
          >
            {batch?.total
              ? `Begin ${batch.total}-card review`
              : data.approved
                ? 'See review schedule'
                : 'Open my notes'}
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-3 text-xs text-muted">
            A suggested batch, not a race. Stop whenever you need to.
            {data.reviewedToday > 0
              ? ` ${data.reviewedToday} reviews saved today.`
              : ''}
          </p>
        </>
      )}
      <div className="mt-6 border-t border-hairline pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl">Read with my notes</h3>
            <p className="mt-1 text-sm text-ink-2">
              Switch to your PDF or a book. Return to finish.
            </p>
          </div>
          <span aria-hidden="true" className="text-2xl text-focus">
            ↗
          </span>
        </div>
        <Button
          className="mt-4"
          variant="ghost"
          block
          disabled={starting}
          onClick={() => onRead(minutes)}
        >
          {starting ? 'Starting…' : `Start ${minutes}-minute reading block`}
        </Button>
        <p className="mt-2 text-xs text-muted">
          Self-reported time, capped at {minutes} minutes. Earns Focus after 5
          minutes, within your daily limit.
        </p>
      </div>
    </section>
  );
};

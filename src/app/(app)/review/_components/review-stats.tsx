'use client';

import { useReviewStats } from '../_hooks/use-review';

const DAY_LABELS = ['Today', 'Tmrw', '+2', '+3', '+4', '+5', '+6'];

// Due, done, retention, and the week ahead. The forecast is what makes
// someone do twenty cards today instead of eighty on Thursday.
export const ReviewStatsPanel = () => {
  const { data } = useReviewStats();
  if (!data) return null;
  const peak = Math.max(1, ...data.forecast.map((d) => d.count));
  return (
    <section
      aria-label="Review stats"
      className="space-y-5 border-t border-hairline pt-6"
    >
      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-muted">Due now</dt>
          <dd className="font-mono text-2xl text-ink tabular-nums">
            {data.dueNow}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Done today</dt>
          <dd className="font-mono text-2xl text-ink tabular-nums">
            {data.reviewedToday}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Retention</dt>
          <dd className="font-mono text-2xl text-ink tabular-nums">
            {data.retention === null
              ? '–'
              : `${Math.round(data.retention * 100)}%`}
          </dd>
        </div>
      </dl>
      <div>
        <p className="text-sm text-muted">Coming due</p>
        <ol
          className="mt-2 grid grid-cols-7 items-end gap-1"
          aria-label="Seven day forecast"
        >
          {data.forecast.map((day) => (
            <li
              key={day.dayOffset}
              className="flex flex-col items-center gap-1"
            >
              <span className="font-mono text-xs text-ink-2 tabular-nums">
                {day.count}
              </span>
              <span
                className="w-full rounded-sm bg-focus/70"
                style={{ height: `${8 + (day.count / peak) * 40}px` }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-muted">
                {DAY_LABELS[day.dayOffset]}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="text-sm text-ink-2">
        {data.totals.total} cards: {data.totals.new} new, {data.totals.learning}{' '}
        learning, {data.totals.mature} mature.
      </p>
    </section>
  );
};

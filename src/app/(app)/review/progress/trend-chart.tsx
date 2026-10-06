'use client';
import { useState } from 'react';
import type { LearningProgress, ScoreCount } from '@/domain/review/progress';

const percent = (s: ScoreCount) =>
  s.total ? `${Math.round((100 * s.correct) / s.total)}%` : 'No results yet';
const date = (key: string) =>
  new Date(key + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
const metrics = {
  choices: {
    title: 'Multiple-choice accuracy',
    description:
      'Correct first choices in completed Review sessions. One scored result per card per day.',
  },
  delayedChoices: {
    title: 'Multiple choice after 7+ days',
    description:
      'Correct choices on cards last reviewed at least seven days earlier. This is a subset of multiple-choice accuracy.',
  },
  delayedRecall: {
    title: 'Self-rated recall after 7+ days',
    description:
      'Flashcard or written reviews rated Good or Easy after at least seven days. Self-assessed, not an objectively scored test.',
  },
} as const;

// Four weeks of one measure at a time, with the counts behind every point.
export function TrendChart({ data }: { data: LearningProgress }) {
  const [metric, setMetric] = useState<keyof typeof metrics>('choices');
  return (
    <section aria-label="Progress chart" className="dash-panel">
      <h2 className="dash-section-heading">Last four weeks</h2>
      <label htmlFor="progress-metric" className="card-section-label mt-5 mb-2">
        Measure
      </label>
      <select
        id="progress-metric"
        className="study-field"
        value={metric}
        onChange={(e) => setMetric(e.target.value as keyof typeof metrics)}
      >
        {Object.entries(metrics).map(([key, value]) => (
          <option key={key} value={key}>
            {value.title}
          </option>
        ))}
      </select>
      <p className="mt-3 text-sm text-ink-2">{metrics[metric].description}</p>
      <p className="mt-5 text-3xl font-bold">{percent(data[metric])}</p>
      <p className="mt-1 text-sm text-ink-2">
        {data[metric].correct} of {data[metric].total} qualifying reviews across
        this period.
      </p>
      {data[metric].total ? (
        <svg
          className="mx-auto mt-5 w-full max-w-md"
          viewBox="0 0 360 205"
          role="img"
          aria-label={`${metrics[metric].title} over four weeks. Exact counts are in the table below.`}
        >
          {[0, 50, 100].map((value) => (
            <g key={value}>
              <line
                x1="38"
                x2="340"
                y1={165 - value * 1.4}
                y2={165 - value * 1.4}
                stroke="var(--color-hairline)"
              />
              <text
                x="36"
                y={169 - value * 1.4}
                textAnchor="end"
                fontSize="14"
                fill="var(--color-ink-2)"
              >
                {value}%
              </text>
            </g>
          ))}
          {data.weeks.map((week, i) => {
            const score = week[metric];
            const previous = data.weeks[i - 1]?.[metric];
            const x = 52 + i * 90;
            const y = score.total
              ? 165 - (score.correct / score.total) * 140
              : 165;
            return (
              <g key={week.start}>
                {score.total > 0 && (
                  <>
                    {previous?.total ? (
                      <line
                        x1={x - 90}
                        y1={165 - (previous.correct / previous.total) * 140}
                        x2={x}
                        y2={y}
                        stroke="var(--color-focus)"
                        strokeWidth="2"
                      />
                    ) : null}
                    <circle cx={x} cy={y} r="5" fill="var(--color-focus)">
                      {/* One string: React renders a title's split text
                          differently on the server and the client. */}
                      <title>{`${date(week.start)} to ${date(week.end)}: ${score.correct} of ${score.total}, ${percent(score)}`}</title>
                    </circle>
                  </>
                )}
                <text
                  x={x}
                  y="191"
                  textAnchor="middle"
                  fontSize="14"
                  fill="var(--color-ink-2)"
                >
                  {date(week.start)}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="my-6 border-y border-hairline py-5 text-ink-2">
          {metric === 'choices'
            ? 'Finish a multiple-choice review to start this chart. Earlier self-ratings cannot be turned into test scores.'
            : 'Results appear after a card has had at least seven days between reviews. Keep following your schedule; no need to delay due cards for this chart.'}
        </p>
      )}
      <details className="mt-4">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">
          Weekly results and sample counts
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">
            {metrics[metric].title}, weekly results
          </caption>
          <thead>
            <tr className="border-b border-hairline">
              <th className="py-3">Week</th>
              <th>Results</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.weeks.map((w) => (
              <tr key={w.start} className="border-b border-hairline">
                <th className="py-3 font-normal">
                  {date(w.start)}–{date(w.end)}
                </th>
                <td>
                  {w[metric].correct}/{w[metric].total}
                </td>
                <td>{w[metric].total ? percent(w[metric]) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="mt-4 text-xs text-muted">
        Blank weeks mean no qualifying results, not 0%. Small samples fluctuate.
        Question difficulty, subjects, and repeated exposure can change scores;
        this chart is not a board-exam pass prediction.
      </p>
    </section>
  );
}

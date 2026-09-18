'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { LearningProgress, ScoreCount } from '@/domain/review/progress';
import { MTLE_SUBJECTS } from '@/domain/study/medtech';
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
export function ProgressView() {
  const [metric, setMetric] = useState<keyof typeof metrics>('choices');
  const { data, isError, refetch } = useQuery({
    queryKey: ['learning-progress'],
    queryFn: () => apiFetch<LearningProgress>('/api/review/progress'),
  });
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div className="page-heading">
        <h1 className="font-semibold">Learning progress</h1>
        <p>What is sticking, and what needs another try.</p>
      </div>
      <Link
        className="inline-flex min-h-11 items-center text-focus underline"
        href="/review"
      >
        Back to review
      </Link>
      {!data ? (
        <p role={isError ? 'alert' : 'status'}>
          {isError ? (
            <>
              Your progress could not load.{' '}
              <button
                className="min-h-11 underline"
                onClick={() => void refetch()}
              >
                Try again
              </button>
            </>
          ) : (
            'Loading your practice results…'
          )}
        </p>
      ) : (
        <>
          <section
            aria-label="Progress chart"
            className="paper-panel p-5 sm:p-8"
          >
            <h2 className="text-2xl font-bold">Your last four weeks</h2>
            <label
              htmlFor="progress-metric"
              className="card-section-label mt-5 mb-2"
            >
              Measure
            </label>
            <select
              id="progress-metric"
              className="study-field"
              value={metric}
              onChange={(e) =>
                setMetric(e.target.value as keyof typeof metrics)
              }
            >
              {Object.entries(metrics).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.title}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm text-ink-2">
              {metrics[metric].description}
            </p>
            <p className="mt-5 text-3xl font-bold">{percent(data[metric])}</p>
            <p className="mt-1 text-sm text-ink-2">
              {data[metric].correct} of {data[metric].total} qualifying reviews
              across this period.
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
                              y1={
                                165 - (previous.correct / previous.total) * 140
                              }
                              x2={x}
                              y2={y}
                              stroke="var(--color-focus)"
                              strokeWidth="2"
                            />
                          ) : null}
                          <circle cx={x} cy={y} r="5" fill="var(--color-focus)">
                            <title>
                              {date(week.start)} to {date(week.end)}:{' '}
                              {score.correct} of {score.total}, {percent(score)}
                            </title>
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
              Blank weeks mean no qualifying results, not 0%. Small samples
              fluctuate. Question difficulty, subjects, and repeated exposure
              can change scores; this chart is not a board-exam pass prediction.
            </p>
          </section>
          <section
            aria-label="Practice patterns"
            className="border-y border-hairline py-5"
          >
            <h2 className="text-xl font-bold">Patterns worth watching</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="font-semibold">
                  Repeated multiple-choice mistakes
                </dt>
                <dd className="text-ink-2">
                  {data.repeatedMisses}{' '}
                  {data.repeatedMisses === 1 ? 'card' : 'cards'} missed on two
                  or more different days in this period. Their next scheduled
                  review is a chance to correct the underlying idea.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Practice consistency</dt>
                <dd className="text-ink-2">
                  {data.activeDays} of 28 days with reviews; {data.reviews}{' '}
                  reviews completed. This measures activity, not mastery.
                </dd>
              </div>
            </dl>
          </section>
          <section aria-label="Results by subject">
            <h2 className="text-xl font-bold">Results by subject</h2>
            <p className="mt-2 text-sm text-ink-2">
              First-choice results by subject. Look at the number of questions
              as well as the percentage.
            </p>
            {data.subjects.length ? (
              <ul className="mt-4 divide-y divide-hairline">
                {data.subjects.map((s) => (
                  <li key={s.subject ?? 'none'} className="py-4">
                    <h3 className="font-semibold">
                      {MTLE_SUBJECTS.find((x) => x.id === s.subject)?.label ??
                        'Subject not set'}
                    </h3>
                    <p className="mt-1 text-sm text-ink-2">
                      {percent(s.choices)} · {s.choices.correct}/
                      {s.choices.total} reviews · {s.cards} distinct cards
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-ink-2">
                Subject results appear as you complete multiple-choice reviews.
                Set subjects in Notes to make this useful.
              </p>
            )}
          </section>
          <details className="border-t border-hairline pt-3">
            <summary className="min-h-11 cursor-pointer content-center font-medium">
              What these measures can tell you
            </summary>
            <div className="space-y-3 py-3 text-sm leading-relaxed text-ink-2">
              <p>
                Delayed testing helps distinguish lasting learning from a good
                result immediately after studying. Seven days is our practical
                reporting window, not a research-established mastery threshold.{' '}
                <a
                  className="underline"
                  href="https://pubmed.ncbi.nlm.nih.gov/19930508/"
                >
                  Study on delayed retention
                </a>
              </p>
              <p>
                Practice on familiar cards is not the same as solving new exam
                questions. Use external mock exams to check transfer.{' '}
                <a
                  className="underline"
                  href="https://pubmed.ncbi.nlm.nih.gov/20804289/"
                >
                  Study on transfer
                </a>
              </p>
              <p>
                Scored results here cover the new Review multiple-choice flow,
                after the rating is saved. Focus-session quizzes are separate.
                Earlier reviews still count toward activity. Deleting a card
                removes its review history. Written answers remain
                self-assessed.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

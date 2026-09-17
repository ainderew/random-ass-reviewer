'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MTLE_BLUEPRINT, MTLE_SUBJECTS } from '@/domain/study/medtech';
import type { StudyPlan } from '@/domain/types/study-plan';
import { apiFetch } from '@/lib/api-client';

export const StudyPlanPanel = () => {
  const { data, isError } = useQuery({
    queryKey: ['study-plan'],
    queryFn: () => apiFetch<StudyPlan>('/api/study-plan'),
  });
  if (!data)
    return (
      <p role="status" className="text-ink-2">
        {isError
          ? 'Could not load subject progress. Reload to try again.'
          : 'Loading subject progress...'}
      </p>
    );
  const month = data.examMonth
    ? new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${data.examMonth}-01T00:00:00Z`))
    : null;
  const unclassified =
    data.subjects.find((s) => s.subject === null)?.total ?? 0;
  return (
    <section
      aria-label="Medtech study plan"
      className="space-y-4 border-t border-hairline pt-6"
    >
      <h2 className="font-serif text-2xl text-ink">Your Medtech review</h2>
      <p className="text-ink-2">
        {month
          ? `Planning for ${month}.`
          : 'Set your target month when you are ready.'}{' '}
        Up to {data.dailyNewCards} new cards each day.{' '}
        <Link href="/settings" className="text-focus underline">
          Edit plan
        </Link>
      </p>
      <p className="text-ink-2">
        This tracks the notes you have approved and practiced. It does not
        measure full syllabus coverage or predict a board-exam score.
      </p>
      <ul className="divide-y divide-hairline">
        {MTLE_SUBJECTS.map((s) => {
          const row = data.subjects.find((r) => r.subject === s.id);
          return (
            <li key={s.id} className="py-3 space-y-1">
              <h3 className="text-ink">{s.label}</h3>
              <p className="text-ink-2">
                {!row?.total
                  ? 'No notes classified here yet.'
                  : `${row.approved} approved cards, ${row.practiced} practiced, across ${row.topics} labeled topics. ${row.total - row.approved} awaiting approval or paused.`}
              </p>
            </li>
          );
        })}
      </ul>
      {unclassified ? (
        <p className="text-ink-2">
          {unclassified} cards still need a subject.{' '}
          <Link href="/notes" className="text-focus underline">
            Organize your notes
          </Link>
        </p>
      ) : null}
      <p className="text-sm text-muted">
        Subject reference:{' '}
        <a href={MTLE_BLUEPRINT.url} className="underline">
          PRC 2023 specifications
        </a>
        . Confirm the applicable version for your exam sitting.
      </p>
      {data.mistakes.length ? (
        <div className="space-y-4">
          <h3 className="font-serif text-2xl text-ink">
            Revisit quiz mistakes
          </h3>
          <p className="text-ink-2">
            Try answering again before opening the correction. This extra
            practice does not change your schedule or earn repeat points.
          </p>
          {data.mistakes.map((m) => (
            <details
              key={m.cardId}
              className="border-b border-hairline pb-3 text-ink-2"
            >
              <summary className="cursor-pointer py-2 text-ink">
                {m.question}
              </summary>
              <div className="space-y-2">
                <p className="text-insight">{m.answer}</p>
                <p>{m.explanation}</p>
                <blockquote>{m.sourceQuote}</blockquote>
                <Link
                  href={`/notes/${m.sourceId}`}
                  className="text-focus underline"
                >
                  Check source and card
                </Link>
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
};

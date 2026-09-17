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
      className="paper-panel space-y-4 p-5 sm:p-7"
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
            <li key={s.id} className="py-4 space-y-1">
              <h3 className="font-medium text-ink">{s.label}</h3>
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
      <div className="border-t border-hairline pt-5">
        <h3 className="font-serif text-2xl">Revisit quiz mistakes</h3>
        <p className="mt-2 text-sm text-ink-2">
          Missed questions return after 24 hours. Try answering before seeing
          the correction.
        </p>
        <Link
          href="/review/mistakes"
          className="mt-3 inline-flex min-h-11 items-center text-focus underline"
        >
          Open delayed checks ↗
        </Link>
      </div>
    </section>
  );
};

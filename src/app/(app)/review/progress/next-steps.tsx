import Image from 'next/image';
import Link from 'next/link';
import type { LearningProgress } from '@/domain/review/progress';
import { progressAdvice } from '@/domain/review/progress-advice';
import { coverSrc, SUBJECT_COVERS } from '../_components/subject-covers';

// One glance: which subjects to go back to, and a button for each. The rules
// and caveats wait behind one disclosure.
export function NextSteps({ data }: { data: LearningProgress }) {
  const subjects = progressAdvice(data);
  const focus = subjects.filter((s) => s.status === 'focus').slice(0, 2);
  const tracked = subjects.filter((s) => s.choices.total > 0).length;
  const anyExtend = subjects.some((s) => s.status === 'extend');
  return (
    <section aria-labelledby="next-steps-heading" className="dash-panel">
      <h2 id="next-steps-heading" className="dash-section-heading">
        What to work on next
      </h2>
      {focus.length ? (
        <ul className="mt-4 space-y-3">
          {focus.map((s) => (
            <li key={s.id} className="next-step">
              <Image
                src={coverSrc(s.id)}
                alt=""
                width={600}
                height={800}
                sizes="36px"
                className="next-step-thumb"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-extrabold text-ink">
                  {SUBJECT_COVERS[s.id].title}
                </span>
                <span className="block text-sm text-ink-2 tabular-nums">
                  {s.missed} of {s.choices.total} missed
                </span>
              </span>
              <Link
                href={`/review?subject=${s.id}`}
                className="next-step-action"
                aria-label={`Review ${SUBJECT_COVERS[s.id].title}`}
              >
                Review
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-ink">
          {anyExtend
            ? 'Nothing missed lately. Try new questions from a question bank to stretch yourself.'
            : 'Not enough multiple-choice answers yet. Keep reviewing.'}
        </p>
      )}
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-medium text-ink-2">
          How this is chosen
        </summary>
        <div className="space-y-2 pb-1 text-sm leading-relaxed text-ink-2">
          <p>
            From your multiple-choice answers in the last 28 days. A subject
            needs at least 5 answers across 3 cards to be ranked; the lowest
            score comes first.
          </p>
          <p>
            {data.repeatedMisses > 0 &&
              `${data.repeatedMisses} ${data.repeatedMisses === 1 ? 'card was' : 'cards were'} missed on two or more days. `}
            {tracked} of 6 subjects have scored answers so far; the rest are
            gaps in the data, not proof of what you know.
            {data.subjects.some((s) => !s.subject) &&
              ' Some answers have no subject; label those cards in Notes.'}
          </p>
          <p>
            These are display rules, not board-exam cutoffs, and they do not
            change your review schedule.
          </p>
        </div>
      </details>
    </section>
  );
}

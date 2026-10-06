import Image from 'next/image';
import Link from 'next/link';
import type { LearningProgress } from '@/domain/review/progress';
import type { ProgressOverview } from '@/domain/types';
import { ChevronRightIcon } from '@/components/icons';
import { coverSrc, SUBJECT_COVERS } from '../_components/subject-covers';
import { StageBar } from './dashboard-parts';

// One row per notebook: how much of it is lasting, and the after-a-week score.
// A row opens that subject's review; an empty one opens Notes.
export const SubjectProgress = ({
  overview,
  progress,
}: {
  overview: ProgressOverview;
  progress: LearningProgress;
}) => (
  <section aria-labelledby="subjects-heading" className="space-y-3">
    <h2 id="subjects-heading" className="dash-section-heading">
      Subjects
    </h2>
    <ul className="dash-list">
      {overview.subjects.map(({ subject, stages }) => {
        const cover = SUBJECT_COVERS[subject];
        const delayed = progress.subjects.find(
          (s) => s.subject === subject,
        )?.delayedChoices;
        const empty = stages.total === 0;
        return (
          <li key={subject}>
            <Link
              href={empty ? '/notes' : `/review?subject=${subject}`}
              className="dash-row"
              data-empty={empty || undefined}
            >
              <Image
                src={coverSrc(subject)}
                alt=""
                width={600}
                height={800}
                sizes="40px"
                className="dash-row-thumb"
              />
              <span className="dash-row-body">
                <span className="truncate font-display text-base font-extrabold text-ink">
                  {cover.title}
                </span>
                {!empty && (
                  <span className="dash-row-score">
                    <b>
                      {delayed?.total
                        ? `${Math.round((100 * delayed.correct) / delayed.total)}%`
                        : '–'}
                    </b>
                    <small>
                      {delayed?.total ? 'after a week' : 'no score yet'}
                    </small>
                  </span>
                )}
                {empty ? (
                  <span className="dash-row-wide text-sm text-ink-2">
                    No cards yet · add notes
                  </span>
                ) : (
                  <>
                    <span className="dash-row-wide">
                      <StageBar stages={stages} />
                    </span>
                    <span className="dash-row-wide text-sm text-ink-2 tabular-nums">
                      {stages.solid} solid · {stages.learning} learning ·{' '}
                      {stages.new} not started
                    </span>
                  </>
                )}
              </span>
              <ChevronRightIcon size={18} className="shrink-0 text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);

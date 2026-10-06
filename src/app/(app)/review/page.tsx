import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { subjectSchema } from '@/domain/study/medtech';
import { reviewQueueFor, reviewStatsKey } from '@/lib/query-keys';
import { auth } from '@/server/auth';
import { getReviewQueue, getSubjectShelf } from '@/server/services/review';
import { getReviewStats } from '@/server/services/review-stats';
import { studyBudget } from '@/domain/review/today';
import { ReviewSession } from './_components/review-session';
import { StudyPlanPanel } from './_components/study-plan';
import { ReviewStatsPanel } from './_components/review-stats';
import { SessionHeading } from './_components/session-heading';
import { SubjectShelf } from './_components/subject-shelf';

// Plain /review opens the shelf. `?subject=` (or `all`) starts a session, and
// Today's `?minutes=` goes straight to one, so its single next step stays one tap.
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ minutes?: string; subject?: string }>;
}) {
  const params = await searchParams;
  const minutes = studyBudget(params.minutes);
  const parsed = subjectSchema.safeParse(params.subject);
  const subject = parsed.success ? parsed.data : undefined;
  const choosing = minutes === null && !subject && params.subject !== 'all';
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const queryClient = new QueryClient();
  const [shelf, stats] = await Promise.all([
    choosing ? getSubjectShelf(session.user.id) : null,
    getReviewStats(session.user.id),
    choosing
      ? null
      : getReviewQueue(session.user.id, subject).then((queue) =>
          queryClient.setQueryData(reviewQueueFor(subject), queue),
        ),
  ]);
  queryClient.setQueryData(reviewStatsKey, stats);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="mx-auto w-full min-w-0 max-w-3xl">
        {shelf ? (
          <div className="page-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h1 className="font-semibold">Review</h1>
              <Link
                href="/review/progress"
                className="inline-flex min-h-11 items-center text-base text-focus underline underline-offset-4"
              >
                See learning progress
              </Link>
            </div>
            <p>Pick a subject, or review everything that is due.</p>
          </div>
        ) : (
          <SessionHeading subject={subject} />
        )}
        <div className="space-y-8">
          {shelf ? (
            <SubjectShelf shelf={shelf} />
          ) : (
            <div className="paper-panel p-5 sm:p-8">
              <ReviewSession minutes={minutes} subject={subject} />
            </div>
          )}
          <details className="border-t border-hairline pt-3">
            <summary className="min-h-11 cursor-pointer content-center font-medium">
              Your schedule and subject progress
            </summary>
            <div className="mt-4 space-y-5">
              <ReviewStatsPanel />
              <StudyPlanPanel />
            </div>
          </details>
        </div>
      </div>
    </HydrationBoundary>
  );
}

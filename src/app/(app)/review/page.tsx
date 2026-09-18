import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { reviewQueueKey, reviewStatsKey } from '@/lib/query-keys';
import { auth } from '@/server/auth';
import { getReviewQueue } from '@/server/services/review';
import { getReviewStats } from '@/server/services/review-stats';
import { studyBudget } from '@/domain/review/today';
import { ReviewSession } from './_components/review-session';
import { StudyPlanPanel } from './_components/study-plan';
import { ReviewStatsPanel } from './_components/review-stats';

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ minutes?: string }>;
}) {
  const minutes = studyBudget((await searchParams).minutes);
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const queryClient = new QueryClient();
  const [queue, stats] = await Promise.all([
    getReviewQueue(session.user.id),
    getReviewStats(session.user.id),
  ]);
  queryClient.setQueryData(reviewQueueKey, queue);
  queryClient.setQueryData(reviewStatsKey, stats);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="mx-auto max-w-3xl">
        <div className="page-heading">
          <h1 className="font-semibold">Review</h1>
          <p>Recall, reveal, then rate your answer.</p>
          <Link
            href="/review/progress"
            className="mt-3 inline-flex min-h-11 items-center text-base text-focus underline"
          >
            See learning progress
          </Link>
        </div>
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="paper-panel p-5 sm:p-8">
              <ReviewSession minutes={minutes} />
            </div>
          </div>
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

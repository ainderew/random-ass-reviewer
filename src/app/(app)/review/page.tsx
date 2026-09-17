import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
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
      <div className="w-full">
        <div className="page-heading">
          <h1 className="font-serif">Make it stick.</h1>
          <p>
            A moment to recall, a little more remembered. Your next cards are
            ready when you are.
          </p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-6">
            <div className="paper-panel p-5 sm:p-8">
              <ReviewSession minutes={minutes} />
            </div>
            <ReviewStatsPanel />
          </div>
          <StudyPlanPanel />
        </div>
      </div>
    </HydrationBoundary>
  );
}

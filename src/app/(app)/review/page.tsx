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
import { ReviewSession } from './_components/review-session';
import { ReviewStatsPanel } from './_components/review-stats';

export default async function ReviewPage() {
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
      <div className="mx-auto max-w-2xl space-y-8">
        <ReviewSession />
        <ReviewStatsPanel />
      </div>
    </HydrationBoundary>
  );
}

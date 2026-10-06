import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import { learningProgressKey, progressOverviewKey } from '@/lib/query-keys';
import { auth } from '@/server/auth';
import { getLearningProgress } from '@/server/services/learning-progress';
import { getProgressOverview } from '@/server/services/progress-overview';
import { ProgressView } from './progress-view';

// Both data sets load on the server, so the dashboard paints complete.
export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const queryClient = new QueryClient();
  const [progress, overview] = await Promise.all([
    getLearningProgress(session.user.id),
    getProgressOverview(session.user.id),
  ]);
  queryClient.setQueryData(learningProgressKey, progress);
  queryClient.setQueryData(progressOverviewKey, overview);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProgressView />
    </HydrationBoundary>
  );
}

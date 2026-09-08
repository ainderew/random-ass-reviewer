import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import { islandQueryKey } from '@/lib/query-keys';
import { auth } from '@/server/auth';
import { getIslandView } from '@/server/services/island';
import { IslandView } from './_components/island-view';

// Server Component. Fetches the island once and hydrates the query so the
// client view starts with data and no spinner of its own.
export default async function IslandPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const queryClient = new QueryClient();
  queryClient.setQueryData(
    islandQueryKey,
    await getIslandView(session.user.id),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IslandView />
    </HydrationBoundary>
  );
}

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { TabBar } from '@/components/nav/tab-bar';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { statsQueryKey } from '@/lib/query-keys';
import { auth } from '@/server/auth';
import { getStatsSnapshot } from '@/server/services/user-stats';

// Server-side guard. A client-side check would ship the protected tree and
// merely hide it. Stats are fetched here once and hydrated into the query
// cache so the HUD and the study page share one source.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const queryClient = new QueryClient();
  queryClient.setQueryData(
    statsQueryKey,
    await getStatsSnapshot(session.user.id),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex flex-1 flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-(--z-toast) focus:rounded-md focus:bg-ground-3 focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <AppHeader />
        <ConnectionStatus />
        {/* Bottom padding clears the phone tab bar plus the home indicator. */}
        <main
          id="main"
          className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-6 md:pt-10 md:pb-12"
        >
          {children}
        </main>
        <TabBar />
      </div>
    </HydrationBoundary>
  );
}

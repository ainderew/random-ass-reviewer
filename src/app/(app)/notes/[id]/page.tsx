import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { getNoteDetail } from '@/server/services/notes';
import { noteDetailKey } from '@/lib/query-keys';
import { NoteDetailView } from './_components/note-detail-view';

export default async function NoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ existing?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const { existing } = await searchParams;

  const queryClient = new QueryClient();
  queryClient.setQueryData(
    noteDetailKey(id),
    await getNoteDetail({ userId: session.user.id, sourceId: id }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NoteDetailView sourceId={id} existing={existing === '1'} />
    </HydrationBoundary>
  );
}

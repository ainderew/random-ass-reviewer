import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { listNotes } from '@/server/services/notes';
import { NotesList } from './_components/notes-list';
import { UploadDropzone } from './_components/upload-dropzone';
import { notesQueryKey } from '@/lib/query-keys';

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const queryClient = new QueryClient();
  queryClient.setQueryData(notesQueryKey, await listNotes(session.user.id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <section className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl text-ink">Notes</h1>
          <p className="max-w-[46ch] leading-relaxed text-ink-2">
            Your notes become your cards. Nothing is invented: a card only
            survives if its quote is in what you uploaded.
          </p>
        </div>
        <UploadDropzone />
        <NotesList />
      </section>
    </HydrationBoundary>
  );
}

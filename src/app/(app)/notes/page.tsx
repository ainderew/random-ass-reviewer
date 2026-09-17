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
      <section className="w-full space-y-8">
        <div className="page-heading">
          <h1 className="font-serif text-4xl text-ink">
            Your notes, ready to grow.
          </h1>
          <p className="max-w-[46ch] leading-relaxed text-ink-2">
            Bring your lecture notes together. Create flashcards, check them
            against the source, and build a deck you trust.
          </p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="paper-panel p-5 sm:p-7">
            <h2 className="mb-5 font-serif text-2xl">Add something to learn</h2>
            <UploadDropzone />
          </div>
          <div className="paper-panel p-5 sm:p-7">
            <h2 className="mb-5 font-serif text-2xl">Your library</h2>
            <NotesList />
          </div>
        </div>
      </section>
    </HydrationBoundary>
  );
}

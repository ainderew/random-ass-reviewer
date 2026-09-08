'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { useNotes } from '../_hooks/use-notes';

const KIND_LABEL = {
  paste: 'Pasted',
  markdown: 'File',
  pdf: 'PDF',
  image: 'Photos',
} as const;

export const NotesList = () => {
  const { data } = useNotes();
  if (!data) return null;
  if (data.length === 0) {
    return (
      <EmptyState
        title="No notes yet"
        body="Upload your lecture notes and we will turn them into flashcards. Every card shows the sentence it came from, so you can trust it. A paragraph from any textbook works as a first try."
      />
    );
  }
  return (
    <ul className="divide-y divide-hairline">
      {data.map((note) => (
        <li key={note.id}>
          <Link
            href={`/notes/${note.id}`}
            className="flex min-h-14 items-center justify-between gap-4 py-3 text-ink hover:text-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span className="flex flex-col">
              <span>{note.title}</span>
              <span className="text-xs text-muted">
                {KIND_LABEL[note.kind]} ·{' '}
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm text-ink-2 tabular-nums">
              {note.cardCount} {note.cardCount === 1 ? 'card' : 'cards'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

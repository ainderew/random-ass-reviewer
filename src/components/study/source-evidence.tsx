import Link from 'next/link';
import { NotesIcon } from '@/components/icons';

/** Read-only evidence has the same visual treatment in setup and practice. */
export const SourceEvidence = ({
  quote,
  passage,
  title,
  sourceId,
  cardId,
}: {
  quote: string;
  passage?: string;
  title?: string;
  sourceId?: string;
  cardId?: string;
}) => (
  <section aria-label="Source" className="source-evidence">
    <div className="flex items-center gap-2 text-ink-2">
      <NotesIcon size={18} />
      <h3 className="text-sm font-semibold">Source</h3>
      <span className="ml-auto text-xs text-muted">From your notes</span>
    </div>
    {title && <p className="mt-3 text-sm font-medium break-words">{title}</p>}
    <blockquote className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-2 break-words">
      {quote}
    </blockquote>
    {passage && (
      <details className="mt-2 text-sm">
        <summary className="min-h-11 cursor-pointer content-center text-focus">
          Read full passage
        </summary>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed break-words">
          {passage}
        </p>
      </details>
    )}
    {sourceId && (
      <Link
        href={`/notes/${sourceId}${cardId ? `#card-${cardId}` : ''}`}
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-focus underline underline-offset-4"
      >
        Open source notes
      </Link>
    )}
  </section>
);

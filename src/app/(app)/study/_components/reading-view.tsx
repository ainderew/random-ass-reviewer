'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatClock } from '@/lib/format-time';
export const ReadingView = ({
  elapsedMs,
  limitMs,
  ending,
  error,
  onEnd,
}: {
  elapsedMs: number;
  limitMs: number;
  ending: boolean;
  error: string | null;
  onEnd: () => void;
}) => {
  const remaining = Math.max(0, limitMs - elapsedMs);
  return (
    <section
      aria-label="Reading session"
      className="mx-auto max-w-lg py-8 text-center"
    >
      <p className="journal-label">An appointment with your notes</p>
      <h1 className="mt-5 font-serif text-4xl">A quiet reading block.</h1>
      <p className="mt-5 text-ink-2">
        Open your PDF, use split view on your iPad, or pick up a book. This
        block keeps its place while you are away.
      </p>
      <p
        className="my-10 font-serif text-7xl tabular-nums"
        aria-label="Reading time remaining"
      >
        {formatClock(remaining)}
      </p>
      <p role="status" className="mb-5 text-sm text-ink-2">
        {remaining
          ? 'Return here when you finish.'
          : 'Your planned block is complete. Take a break, then try recalling what you read.'}
      </p>
      <Button block size="lg" disabled={ending} onClick={onEnd}>
        {ending ? 'Saving…' : 'Finish reading'}
      </Button>
      {error && (
        <p role="alert" className="mt-4 text-warn">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-muted">
        Self-reported study time. The server caps this block at{' '}
        {limitMs / 60_000} minutes, even if you return later. The usual daily
        reward limit applies.
      </p>
      <Link
        href="/notes"
        className="mt-6 inline-flex min-h-11 items-center text-focus underline"
      >
        Open my notes
      </Link>
    </section>
  );
};

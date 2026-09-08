'use client';

import Link from 'next/link';
import { Button } from './button';

// One look for every failure. The real error is logged by the caller; this
// never renders error.message, which can carry a stack or a connection string.
export const ErrorState = ({
  title,
  body,
  digest,
  onRetry,
  homeHref = '/study',
}: {
  title: string;
  body: string;
  digest?: string;
  onRetry?: () => void;
  homeHref?: string;
}) => (
  <section role="alert" className="mx-auto max-w-md space-y-4">
    <h1 className="font-serif text-3xl text-ink">{title}</h1>
    <p className="leading-relaxed text-ink-2">{body}</p>
    <div className="flex flex-wrap items-center gap-3">
      {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
      <Link
        href={homeHref}
        className="inline-flex min-h-11 items-center rounded-md px-3 text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Back to study
      </Link>
    </div>
    {digest ? (
      <p className="font-mono text-xs text-muted">Reference {digest}</p>
    ) : null}
  </section>
);

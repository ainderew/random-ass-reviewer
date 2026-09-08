import Link from 'next/link';
import type { ReactNode } from 'react';

// A task, or an achievement. The copy decides which; the shape stays the same.
export const EmptyState = ({
  title,
  body,
  action,
  children,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) => (
  <section className="space-y-3">
    <h2 className="font-serif text-2xl text-ink">{title}</h2>
    <p className="max-w-[46ch] leading-relaxed text-ink-2">{body}</p>
    {action ? (
      <Link
        href={action.href}
        className="inline-flex min-h-11 items-center rounded-md bg-focus px-4 font-medium text-ground hover:bg-focus-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {action.label}
      </Link>
    ) : null}
    {children}
  </section>
);

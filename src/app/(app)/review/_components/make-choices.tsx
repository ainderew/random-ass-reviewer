'use client';
import Link from 'next/link';
import type { QueuedCard } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { useMakeChoices } from '../_hooks/use-review';

// Shown in place of the options when Choices is picked for a card without
// any. One tap writes them; the editor link is for writing them by hand.
export const MakeChoices = ({
  card,
  onMade,
}: {
  card: QueuedCard;
  onMade: () => void;
}) => {
  const make = useMakeChoices();
  const editHref = card.source
    ? `/notes/${card.source.id}?edit=${card.id}#card-${card.id}`
    : '/notes';
  return (
    <div className="mt-5 rounded-xl bg-ground-3 p-4 sm:p-5">
      <p className="font-semibold text-ink">This card has no choices yet.</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">
        Aloft can write three wrong options from your notes and show them right
        away. If one looks off, fix it in the card editor.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Button
          onClick={() => make.mutate(card.id, { onSuccess: onMade })}
          disabled={make.isPending}
          aria-busy={make.isPending}
        >
          {make.isPending ? 'Writing…' : 'Make choices'}
        </Button>
        <Link
          href={editHref}
          className="inline-flex min-h-11 items-center text-sm text-focus underline underline-offset-4"
        >
          Write them myself
        </Link>
      </div>
      {make.isError && (
        <p role="alert" className="mt-3 text-sm text-warn">
          {make.error instanceof ApiError
            ? make.error.message
            : 'Could not make choices. Try again.'}
        </p>
      )}
    </div>
  );
};

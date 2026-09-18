'use client';
import type { QueuedCard, Rating } from '@/domain/types';
import { formatInterval } from '@/lib/format-interval';
const LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};
const MEANING: Record<Rating, string> = {
  1: 'I forgot',
  2: 'With effort',
  3: 'I remembered',
  4: 'Immediately',
};
export const RatingButtons = ({
  card,
  disabled,
  onRate,
}: {
  card: QueuedCard;
  disabled: boolean;
  onRate: (rating: Rating) => void;
}) => (
  <div
    role="group"
    aria-label="Rate your recall"
    className="grid grid-cols-2 gap-3 sm:grid-cols-4"
  >
    {([1, 2, 3, 4] as const).map((rating) => (
      <button
        key={rating}
        type="button"
        disabled={disabled}
        onClick={() => onRate(rating)}
        aria-keyshortcuts={String(rating)}
        aria-label={`${LABELS[rating]}, next in ${formatInterval(card.intervals[rating])}`}
        className="recall-choice"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="font-semibold">{LABELS[rating]}</span>
          <kbd className="hidden text-xs text-muted sm:inline">{rating}</kbd>
        </span>
        <span className="text-sm text-ink-2">{MEANING[rating]}</span>
        <span className="mt-2 text-xs text-muted">
          Next: {formatInterval(card.intervals[rating])}
        </span>
      </button>
    ))}
  </div>
);

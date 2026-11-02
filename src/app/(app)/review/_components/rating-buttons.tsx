'use client';
import type { QueuedCard, Rating } from '@/domain/types';
import { formatInterval } from '@/lib/format-interval';
const LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
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
    className="grid grid-cols-4 gap-2"
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
      </button>
    ))}
  </div>
);

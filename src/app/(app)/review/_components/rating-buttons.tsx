'use client';

import type { QueuedCard, Rating } from '@/domain/types';
import { formatInterval } from '@/lib/format-interval';

const LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

const TONE: Record<Rating, string> = {
  1: 'text-warn',
  2: 'text-ink-2',
  3: 'text-insight',
  4: 'text-focus',
};

// Each button shows its projected interval: the algorithm made legible.
// The digit is the keyboard shortcut and stays visible.
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
        className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border border-hairline bg-ground-2 px-2 py-2 transition-colors duration-150 hover:bg-ground-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
      >
        <span className={`text-sm font-medium ${TONE[rating]}`}>
          <span className="mr-1 font-mono text-xs text-muted">{rating}</span>
          {LABELS[rating]}
        </span>
        <span className="font-mono text-xs text-muted tabular-nums">
          {formatInterval(card.intervals[rating])}
        </span>
      </button>
    ))}
  </div>
);

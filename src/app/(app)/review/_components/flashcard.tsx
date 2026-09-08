'use client';

import type { QueuedCard } from '@/domain/types';

// Question on the front, answer and its source quote on the back. The quote
// is the trust feature from /notes, kept here for the same reason.
export const Flashcard = ({
  card,
  revealed,
}: {
  card: QueuedCard;
  revealed: boolean;
}) => (
  <div className="flip-scene">
    <div
      className="flip-card min-h-64"
      data-flipped={revealed ? 'true' : 'false'}
    >
      <div className="flip-face flip-front flex min-h-64 flex-col justify-center rounded-lg border border-hairline bg-ground-2 px-5 py-6">
        <p className="text-xs text-muted">
          {card.isNew ? 'New card' : 'Review'}
        </p>
        <p className="mt-3 text-xl leading-relaxed text-ink">{card.question}</p>
      </div>
      <div
        className="flip-face flip-back flex min-h-64 flex-col justify-center rounded-lg border border-insight/40 bg-ground-2 px-5 py-6"
        aria-hidden={!revealed}
        aria-live="polite"
      >
        <p className="text-xs text-muted">Answer</p>
        <p className="mt-3 text-xl leading-relaxed text-insight">
          {card.answer}
        </p>
        <blockquote className="mt-4 text-sm leading-relaxed text-muted">
          “{card.sourceQuote}”
        </blockquote>
      </div>
    </div>
  </div>
);

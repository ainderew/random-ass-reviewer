'use client';
import type { QueuedCard } from '@/domain/types';
export const Flashcard = ({
  card,
  revealed,
}: {
  card: QueuedCard;
  revealed: boolean;
}) => (
  <div className="min-h-64 border-y border-hairline py-7">
    <p className="journal-label">
      {card.isNew ? 'First encounter' : 'Recall & remember'}
    </p>
    <p className="mt-5 font-serif text-2xl leading-relaxed text-ink sm:text-3xl">
      {card.question}
    </p>
    {revealed && (
      <div className="mt-6 border-t border-hairline pt-5" aria-live="polite">
        <p className="journal-label">Answer</p>
        <p className="mt-3 text-xl leading-relaxed text-focus whitespace-pre-wrap">
          {card.answer}
        </p>
        <details className="mt-5 text-sm text-ink-2">
          <summary className="cursor-pointer py-3">
            Check the source passage
          </summary>
          <blockquote className="border-l-2 border-insight/40 pl-4 whitespace-pre-wrap">
            “{card.sourceQuote}”
          </blockquote>
        </details>
      </div>
    )}
  </div>
);

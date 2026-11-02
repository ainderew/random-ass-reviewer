'use client';
import type { ReactNode } from 'react';
import type { QueuedCard } from '@/domain/types';
import { SourceEvidence } from '@/components/study/source-evidence';

export const Flashcard = ({
  card,
  revealed,
  children,
}: {
  card: QueuedCard;
  revealed: boolean;
  children?: ReactNode;
}) => (
  <div className="review-card">
    <section
      aria-label="Question"
      className={`review-question ${revealed || children ? 'is-revealed' : ''}`}
    >
      <h2 className="sr-only">Question</h2>
      <p className="font-display text-2xl font-extrabold leading-[1.45] tracking-[-0.015em] break-words sm:text-[1.75rem]">
        {card.question}
      </p>
    </section>
    {children}
    {revealed && (
      <div aria-live="polite">
        <section aria-label="Answer" className="answer-section mt-5">
          <h2 className="sr-only">Answer</h2>
          <p className="whitespace-pre-wrap text-xl leading-relaxed break-words">
            {card.answer}
          </p>
        </section>
        <details className="mt-5 text-sm text-muted">
          <summary className="min-h-11 cursor-pointer content-center">
            Source
          </summary>
          <SourceEvidence
            quote={card.sourceQuote}
            title={card.source?.title}
            sourceId={card.source?.id}
          />
        </details>
      </div>
    )}
  </div>
);

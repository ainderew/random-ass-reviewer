'use client';
import Image from 'next/image';
import type { QueuedCard } from '@/domain/types';
import { SourceEvidence } from '@/components/study/source-evidence';

export const Flashcard = ({
  card,
  revealed,
}: {
  card: QueuedCard;
  revealed: boolean;
}) => (
  <div className="review-card">
    <section
      aria-label="Question"
      className={`review-question ${revealed ? 'is-revealed' : ''}`}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="card-section-label">Question</h2>
        {card.isNew && <span className="text-xs text-muted">New card</span>}
      </div>
      <p className="mt-5 font-display text-2xl font-extrabold leading-[1.45] tracking-[-0.015em] break-words sm:text-[1.75rem]">
        {card.question}
      </p>
      {!revealed && (
        <div className="mt-6 flex items-center gap-4 border-t border-hairline pt-5">
          <Image
            src="/illustrations/study-cards-v1.png"
            alt=""
            width={1536}
            height={1024}
            sizes="88px"
            className="w-22 shrink-0"
          />
          <p className="text-sm text-ink-2">
            Try recalling it first.
            <br />
            Reveal when you are ready.
          </p>
        </div>
      )}
    </section>
    {revealed && (
      <div aria-live="polite">
        <section aria-label="Answer" className="answer-section mt-5">
          <h2 className="card-section-label">Answer</h2>
          <p className="mt-3 whitespace-pre-wrap text-xl leading-relaxed break-words">
            {card.answer}
          </p>
        </section>
        <div className="mt-5">
          <SourceEvidence
            quote={card.sourceQuote}
            title={card.source?.title}
            sourceId={card.source?.id}
          />
        </div>
      </div>
    )}
  </div>
);

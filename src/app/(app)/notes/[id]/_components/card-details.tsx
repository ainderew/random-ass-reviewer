'use client';
import type { Card } from '@/domain/types';
import { MTLE_SUBJECTS } from '@/domain/study/medtech';
import { Button } from '@/components/ui/button';
import { SourceEvidence } from '@/components/study/source-evidence';

export const CardDetails = ({
  card,
  source,
  sourceTitle,
  busy,
  onEdit,
  onStatus,
}: {
  card: Card;
  source: string;
  sourceTitle?: string;
  busy: boolean;
  onEdit: () => void;
  onStatus: (status: Card['reviewStatus']) => void;
}) => {
  const approved = card.reviewStatus === 'approved';
  const subject = MTLE_SUBJECTS.find((s) => s.id === card.subject)?.label;
  return (
    <article className="card-record" aria-label="Flashcard">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-4">
        <p
          className={`text-sm font-semibold ${card.reviewStatus === 'flagged' ? 'text-warn' : approved ? 'text-focus' : 'text-ink-2'}`}
        >
          {approved
            ? 'Approved for study'
            : card.reviewStatus === 'flagged'
              ? 'Flagged for correction'
              : 'Needs your review'}
        </p>
        <span className="text-xs text-muted">
          {approved
            ? 'Included in review sessions'
            : 'Not in review sessions yet'}
        </span>
      </div>
      <p className="mt-4 text-sm text-ink-2">
        Answer type:{' '}
        {
          {
            auto: 'Automatic regimen',
            recall: 'Flashcard',
            write: 'Written answer',
            choice: 'Multiple choice',
          }[card.answerType ?? 'auto']
        }
      </p>
      <div className="card-setup-grid">
        <div className="min-w-0">
          <section aria-label="Question" className="py-5">
            <h3 className="card-section-label">Question</h3>
            <p className="mt-3 text-xl font-semibold leading-relaxed break-words">
              {card.question}
            </p>
          </section>
          <section aria-label="Answer" className="answer-section">
            <h3 className="card-section-label">Answer</h3>
            <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed break-words">
              {card.answer}
            </p>
          </section>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 text-sm">
            <span className="font-semibold">Subject</span>
            {subject ? (
              <span>{subject}</span>
            ) : (
              <button
                type="button"
                className="min-h-11 text-focus underline underline-offset-4"
                onClick={onEdit}
                disabled={busy}
              >
                Choose a subject
              </button>
            )}
            {card.topic && <span className="text-muted">{card.topic}</span>}
          </div>
          {!subject && (
            <p className="text-xs text-muted">
              Optional. Groups this card in your Medtech study plan.
            </p>
          )}
        </div>
        <div className="min-w-0 pt-5">
          <SourceEvidence
            quote={card.sourceQuote}
            passage={source}
            title={sourceTitle}
          />
        </div>
      </div>
      {card.quiz && (
        <details className="mt-5 border-t border-hairline pt-2 text-sm text-ink-2">
          <summary className="min-h-11 cursor-pointer content-center font-medium">
            Multiple-choice practice · check choices
          </summary>
          <p className="mt-3">{card.quiz.explanation}</p>
          <ol className="mt-4 list-decimal space-y-3 pl-5">
            {card.quiz.distractors.map((d, i) => (
              <li key={i}>
                <p className="font-medium">{d.text}</p>
                <p>{d.explanation}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
      <div className="mt-5 flex flex-wrap gap-3 border-t border-hairline pt-5">
        <Button onClick={onEdit} disabled={busy}>
          {approved ? 'Edit card' : 'Edit and approve'}
        </Button>
        {card.reviewStatus !== 'flagged' && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onStatus('flagged')}
          >
            Flag for correction
          </Button>
        )}
      </div>
    </article>
  );
};

'use client';
import type { Card } from '@/domain/types';
import { MTLE_SUBJECTS } from '@/domain/study/medtech';
import { Button } from '@/components/ui/button';

export const CardDetails = ({
  card,
  source,
  busy,
  onEdit,
  onStatus,
}: {
  card: Card;
  source: string;
  busy: boolean;
  onEdit: () => void;
  onStatus: (status: Card['reviewStatus']) => void;
}) => (
  <div className="space-y-3">
    <p className="text-sm text-muted">
      {card.reviewStatus === 'approved'
        ? 'Approved for study'
        : card.reviewStatus === 'flagged'
          ? 'Flagged for correction'
          : 'Draft: check before studying'}
    </p>
    <p className="text-ink">{card.question}</p>
    <p className="text-insight">{card.answer}</p>
    <p className="text-ink-2">
      {MTLE_SUBJECTS.find((s) => s.id === card.subject)?.label ??
        'Unclassified'}
      {card.topic ? ` · ${card.topic}` : ''}
    </p>
    <blockquote className="text-ink-2">{card.sourceQuote}</blockquote>
    <details className="text-ink-2">
      <summary className="cursor-pointer py-2">Read source passage</summary>
      <p className="whitespace-pre-wrap leading-relaxed">{source}</p>
    </details>
    {card.quiz ? (
      <details className="text-ink-2">
        <summary className="cursor-pointer py-2">
          Check quiz choices and explanations
        </summary>
        <p>{card.quiz.explanation}</p>
        <ol className="list-decimal space-y-3 pl-5 mt-3">
          {card.quiz.distractors.map((d, i) => (
            <li key={i}>
              <p>{d.text}</p>
              <p>{d.explanation}</p>
            </li>
          ))}
        </ol>
      </details>
    ) : null}
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" onClick={onEdit}>
        Edit and approve
      </Button>
      {card.reviewStatus !== 'flagged' ? (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => onStatus('flagged')}
        >
          Flag for correction
        </Button>
      ) : null}
    </div>
  </div>
);

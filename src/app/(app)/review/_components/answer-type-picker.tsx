'use client';
import type { PracticeType } from '@/domain/review/regimen';

const OPTIONS: Array<{ type: PracticeType; label: string }> = [
  { type: 'recall', label: 'Flashcard' },
  { type: 'write', label: 'Write' },
  { type: 'choice', label: 'Choices' },
];

// How to answer this card. The regimen's pick is labelled, a different pick
// lasts for this card only, and Choices stays tappable without options so it
// can offer to make them instead of sitting greyed out.
export const AnswerTypePicker = ({
  mode,
  suggested,
  hasChoices,
  locked,
  onSelect,
}: {
  mode: PracticeType;
  suggested: PracticeType;
  hasChoices: boolean;
  locked: boolean;
  onSelect: (type: PracticeType) => void;
}) => (
  <div>
    <fieldset className="answer-type" disabled={locked}>
      <legend className="sr-only">Answer this card as</legend>
      {OPTIONS.map(({ type, label }) => {
        const note =
          type === 'choice' && !hasChoices
            ? 'No choices yet'
            : type === suggested
              ? 'Suggested'
              : null;
        return (
          <label key={type} className="answer-type-option">
            <input
              type="radio"
              name="answer-type"
              value={type}
              checked={mode === type}
              onChange={() => onSelect(type)}
            />
            {label}
            {note && <span className="answer-type-note">{note}</span>}
          </label>
        );
      })}
    </fieldset>
    {mode !== suggested && !locked && (
      <p className="mt-2 text-xs text-muted">
        Just for this card. The next card goes back to your regimen.
      </p>
    )}
  </div>
);

'use client';
import { useState } from 'react';
import type { QueuedCard } from '@/domain/types';
import { shuffleWithSeed } from '@/domain/review/queue';

export type PracticeMode = 'recall' | 'write' | 'choice';
export const PRACTICE_MODES = {
  recall: {
    title: 'Flashcards',
    hint: 'Recall the answer aloud or in your head before revealing it.',
  },
  write: {
    title: 'Write your answer',
    hint: 'Put what you remember into words, then compare with your notes.',
  },
  choice: {
    title: 'Multiple choice',
    hint: 'Try answering before looking at the options. Then choose and read the feedback.',
  },
} as const;

export function PracticePrompt({
  card,
  mode,
  revealed,
  onChoice,
}: {
  card: QueuedCard;
  mode: PracticeMode;
  revealed: boolean;
  onChoice: (correct: boolean, selectedAnswer: string) => void;
}) {
  const [seed] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const options = card.quiz
    ? shuffleWithSeed(
        [
          {
            text: card.answer,
            explanation: card.quiz.explanation,
            correct: true,
          },
          ...card.quiz.distractors.map((d) => ({ ...d, correct: false })),
        ],
        `practice:${seed}:${card.id}`,
      )
    : [];
  if (mode === 'write')
    return (
      <div className="mt-5 space-y-2">
        <label htmlFor="practice-answer" className="card-section-label">
          Your answer
        </label>
        <textarea
          id="practice-answer"
          className="study-field"
          rows={4}
          value={draft}
          readOnly={revealed}
          maxLength={5000}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What do you remember?"
        />
        <p className="text-sm text-ink-2">
          {revealed
            ? 'Compare the meaning, not the exact wording. This answer is not automatically graded.'
            : 'A few key points are enough. Your writing stays on this card and is cleared when you move on.'}
        </p>
      </div>
    );
  if (mode !== 'choice') return null;
  return (
    <div className="mt-5 space-y-3">
      <fieldset disabled={revealed} className="space-y-3">
        <legend className="card-section-label mb-3">Choose an answer</legend>
        {options.map((option, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={selected === i}
            className={`w-full rounded-xl border p-4 text-left text-base leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${selected === i ? 'border-focus bg-ground-3' : 'border-hairline bg-ground-2'}`}
            onClick={() => {
              if (selected !== null) return;
              setSelected(i);
              onChoice(option.correct, option.text);
            }}
          >
            <span className="mr-3 font-semibold">
              {String.fromCharCode(65 + i)}.
            </span>
            {option.text}
            {revealed && option.correct && (
              <span className="mt-2 block font-semibold">Correct answer</span>
            )}
            {selected === i && (
              <span className="mt-2 block text-sm">Your choice</span>
            )}
          </button>
        ))}
      </fieldset>
      {selected !== null && (
        <div role="status" className="rounded-xl bg-ground-3 p-4">
          <p className="font-semibold">
            {options[selected]!.correct
              ? 'Correct. Check the reasoning below.'
              : 'Not quite. Read the correction, then try recalling it next time.'}
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            {options[selected]!.explanation}
          </p>
          {!options[selected]!.correct && (
            <p className="mt-2 text-sm leading-relaxed">
              {card.quiz?.explanation}
            </p>
          )}
          <p className="mt-2 text-sm text-ink-2">
            {options[selected]!.correct
              ? 'If you guessed, rate Again. Recognizing an option is different from recalling it without help.'
              : 'Use Again to bring this card back sooner.'}
          </p>
        </div>
      )}
    </div>
  );
}

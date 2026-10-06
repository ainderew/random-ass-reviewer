'use client';
import { useState } from 'react';
import type { QueuedCard } from '@/domain/types';
import { shuffleWithSeed } from '@/domain/review/queue';
import {
  AnswerVerdict,
  ChoiceButton,
  choiceState,
  useAnswerCue,
} from '@/components/study/answer-feedback';

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
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const cue = useAnswerCue();
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
        // Same on the server and in the browser, so the page hydrates; new
        // with each review of the card, so positions cannot be memorised.
        `practice:${card.id}:${card.reviewCount ?? 0}`,
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
  const correctIndex = options.findIndex((o) => o.correct);
  const picked = selected === null ? null : options[selected]!;
  return (
    <div className="mt-5 space-y-3">
      <fieldset disabled={revealed} className="space-y-2.5">
        <legend className="card-section-label mb-1">Choose an answer</legend>
        <p className="pb-1 text-sm text-ink-2">{PRACTICE_MODES.choice.hint}</p>
        {options.map((option, i) => (
          <ChoiceButton
            key={i}
            index={i}
            state={choiceState({
              index: i,
              picked: selected,
              correct: selected === null ? null : correctIndex,
            })}
            onPick={() => {
              if (selected !== null) return;
              setSelected(i);
              cue(option.correct);
              onChoice(option.correct, option.text);
            }}
          >
            {option.text}
          </ChoiceButton>
        ))}
      </fieldset>
      {picked && (
        <AnswerVerdict correct={picked.correct}>
          {picked.explanation && (
            <p className="text-sm leading-relaxed text-ink-2">
              {picked.explanation}
            </p>
          )}
          {!picked.correct && card.quiz?.explanation && (
            <p className="text-sm leading-relaxed text-ink-2">
              {card.quiz.explanation}
            </p>
          )}
          <p className="text-sm text-ink-2">
            {picked.correct
              ? 'Guessed? Rate Again so it comes back sooner.'
              : 'Rate Again and it comes back sooner.'}
          </p>
        </AnswerVerdict>
      )}
    </div>
  );
}

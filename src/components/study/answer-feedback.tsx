'use client';
import { useCallback, type ReactNode } from 'react';
import { CheckIcon, CrossIcon } from '@/components/icons';
import { playPitched } from '@/game/systems/juice/play-pitched';
import { useReducedMotion } from '@/lib/use-reduced-motion';

// Right and wrong, read at a glance and the same everywhere a choice is
// graded: the review, the focus quiz, and the mistake follow-up. Green with a
// tick, red with a cross, and words beside both, never colour alone.

export type ChoiceState =
  'idle' | 'pending' | 'right' | 'wrong' | 'answer' | 'dim';

export function choiceState(input: {
  index: number;
  picked: number | null;
  // Index of the correct option, once known.
  correct: number | null;
}): ChoiceState {
  const { index, picked, correct } = input;
  if (picked === null) return 'idle';
  if (correct === null) return index === picked ? 'pending' : 'idle';
  if (index === picked) return index === correct ? 'right' : 'wrong';
  return index === correct ? 'answer' : 'dim';
}

const TAG: Partial<Record<ChoiceState, string>> = {
  right: 'Correct',
  wrong: 'Your answer',
  answer: 'Correct answer',
};

export const ChoiceButton = ({
  index,
  state,
  onPick,
  disabled,
  children,
}: {
  index: number;
  state: ChoiceState;
  onPick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) => {
  const reduced = useReducedMotion();
  const graded = state === 'right' || state === 'wrong' || state === 'answer';
  return (
    <button
      type="button"
      className="choice"
      data-state={state}
      data-animate={(!reduced && graded) || undefined}
      aria-pressed={
        state === 'right' || state === 'wrong' || state === 'pending'
      }
      disabled={disabled}
      onClick={onPick}
    >
      <span className="choice-badge" aria-hidden="true">
        {state === 'right' || state === 'answer' ? (
          <CheckIcon size={16} strokeWidth={2.5} />
        ) : state === 'wrong' ? (
          <CrossIcon size={16} strokeWidth={2.5} />
        ) : (
          String.fromCharCode(65 + index)
        )}
      </span>
      <span className="min-w-0 flex-1">
        {children}
        {TAG[state] && <span className="choice-tag">{TAG[state]}</span>}
      </span>
    </button>
  );
};

// The verdict under the options: one word, then whatever explains it. The
// right answer is already lit green above, so it is not repeated here.
export const AnswerVerdict = ({
  correct,
  children,
}: {
  correct: boolean;
  children?: ReactNode;
}) => (
  <div role="status" className="verdict" data-correct={correct}>
    <span className="verdict-icon" aria-hidden="true">
      {correct ? (
        <CheckIcon size={18} strokeWidth={2.75} />
      ) : (
        <CrossIcon size={18} strokeWidth={2.75} />
      )}
    </span>
    <div className="min-w-0 flex-1 space-y-2">
      <p className="verdict-title">{correct ? 'Correct!' : 'Not quite'}</p>
      {children}
    </div>
  </div>
);

// A chime up for right, one soft low note for wrong (only when sounds are on),
// and a light buzz on phones that have one, unless motion is reduced.
// `streak` raises the chime a semitone per right answer in a row.
export function useAnswerCue(): (correct: boolean, streak?: number) => void {
  const reduced = useReducedMotion();
  return useCallback(
    (correct: boolean, streak = 0) => {
      if (correct) {
        const semitones = Math.max(0, streak);
        playPitched({ frequency: 659.25, durationMs: 110, semitones });
        setTimeout(
          () => playPitched({ frequency: 987.77, durationMs: 180, semitones }),
          90,
        );
      } else {
        playPitched({
          frequency: 233,
          durationMs: 220,
          type: 'triangle',
          gain: 0.1,
        });
      }
      if (
        !reduced &&
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator
      )
        navigator.vibrate(correct ? 12 : [16, 60, 16]);
    },
    [reduced],
  );
}

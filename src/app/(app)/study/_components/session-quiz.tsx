'use client';

import { useEffect, useState } from 'react';
import { MAX_QUIZ_MULTIPLIER } from '@/domain/review/constants';
import type { QuizResult } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { playPitched } from '@/game/systems/juice/play-pitched';
import { ApiError } from '@/lib/api-client';
import { useSessionQuiz } from '../_hooks/use-session-quiz';
import { TimerFrame } from './timer-frame';

// Optional, and it only ever adds. Skip is visible from the first frame.
// Skipping or scoring badly leaves the session exactly where it was.
export const SessionQuiz = ({
  sessionId,
  onSkip,
  onFinished,
}: {
  sessionId: string;
  onSkip: () => void;
  onFinished: (result: QuizResult) => void;
}) => {
  const { quiz, answer, finish, progress } = useSessionQuiz(sessionId);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const questions = quiz.data?.questions ?? [];
  const question = questions[index];
  const skipToReward =
    quiz.isSuccess && (quiz.data.submitted || questions.length === 0);

  // Nothing to ask (no seen cards yet, or already taken): straight to the reward.
  useEffect(() => {
    if (skipToReward) onSkip();
  }, [skipToReward, onSkip]);

  if (quiz.isPending) {
    return (
      <TimerFrame label="Quiz">
        <p className="text-ink-2">Preparing your questions…</p>
      </TimerFrame>
    );
  }
  if (quiz.isError || !question || skipToReward) {
    return (
      <TimerFrame
        label="Quiz"
        actions={
          <Button size="lg" block onClick={onSkip}>
            Continue to your reward
          </Button>
        }
      >
        <p className="text-ink-2">
          The quiz is not available right now. Your Focus is safe.
        </p>
      </TimerFrame>
    );
  }

  const choose = (optionIndex: number) => {
    if (answer.isPending || picked !== null) return;
    setPicked(optionIndex);
    setError(null);
    answer.mutate(
      { cardId: question.cardId, optionIndex },
      {
        onSuccess: (result) => {
          if (result.correct)
            playPitched({
              frequency: 659.25,
              semitones: result.correctSoFar - 1,
            });
        },
        onError: (caught) => {
          if (caught instanceof ApiError && caught.code === 'INVALID_STATE') {
            // Already answered (a refresh mid-question). Move on.
            return;
          }
          setPicked(null);
          setError('Could not check that answer. Try again, or skip.');
        },
      },
    );
  };

  const next = () => {
    setPicked(null);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    finish.mutate(undefined, {
      onSuccess: (result) => onFinished(result),
      onError: () =>
        setError('Could not finish the quiz. You can skip; nothing is lost.'),
    });
  };

  const multiplier = progress?.multiplier ?? 1;

  return (
    <TimerFrame
      label="Quiz"
      actions={
        <div className="space-y-2">
          {picked !== null && !answer.isPending ? (
            <Button size="lg" block onClick={next} disabled={finish.isPending}>
              {index + 1 < questions.length ? 'Next' : 'See my bonus'}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            block
            onClick={onSkip}
            disabled={finish.isPending}
          >
            Skip, keep my Focus as is
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-sm text-ink-2 tabular-nums">
            {index + 1} / {questions.length}
          </p>
          <p
            key={multiplier}
            className="spring-pop font-mono text-2xl text-focus tabular-nums"
            aria-live="polite"
            aria-label={`Bonus multiplier ${multiplier.toFixed(1)}`}
          >
            ×{multiplier.toFixed(1)}
          </p>
        </div>
        <p className="text-sm text-muted">
          {progress
            ? `${progress.correctSoFar} right so far. Up to ×${MAX_QUIZ_MULTIPLIER.toFixed(1)} on your Focus.`
            : `Answer ${questions.length} questions from your own notes for up to ×${MAX_QUIZ_MULTIPLIER.toFixed(1)} Focus.`}
        </p>
        <p className="text-xl leading-relaxed text-ink">{question.question}</p>
        <ol className="space-y-2" aria-label="Options">
          {question.options.map((option, optionIndex) => {
            const isPicked = picked === optionIndex;
            const graded = isPicked && progress && !answer.isPending;
            const tone = graded
              ? progress.correct
                ? 'border-insight text-insight'
                : 'border-warn text-warn'
              : isPicked
                ? 'border-focus text-ink'
                : 'border-hairline text-ink hover:bg-ground-3';
            return (
              <li key={optionIndex}>
                <button
                  type="button"
                  onClick={() => choose(optionIndex)}
                  disabled={picked !== null}
                  className={`w-full min-h-12 rounded-md border bg-ground-2 px-4 py-3 text-left leading-relaxed transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default ${tone}`}
                >
                  {option}
                </button>
              </li>
            );
          })}
        </ol>
        {graded(picked, progress, answer.isPending) ? (
          <p
            role="status"
            className={`text-sm ${progress!.correct ? 'text-insight' : 'text-ink-2'}`}
          >
            {progress!.correct ? 'Right.' : 'Not that one. No penalty.'}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-warn">
            {error}
          </p>
        ) : null}
      </div>
    </TimerFrame>
  );
};

function graded(
  picked: number | null,
  progress: unknown,
  pending: boolean,
): boolean {
  return picked !== null && progress !== null && !pending;
}

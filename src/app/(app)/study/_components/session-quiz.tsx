'use client';

import { useEffect, useState } from 'react';
import { MAX_QUIZ_MULTIPLIER } from '@/domain/review/constants';
import type { QuizResult } from '@/domain/types';
import { Button } from '@/components/ui/button';
import {
  AnswerVerdict,
  ChoiceButton,
  choiceState,
  useAnswerCue,
  type ChoiceState,
} from '@/components/study/answer-feedback';
import { useSessionQuiz } from '../_hooks/use-session-quiz';
import { TimerFrame } from './timer-frame';

// Optional, and it only ever adds. The top row says so and the skip is in
// the action row, which phones keep in the thumb zone. The multiplier stays
// quiet until it has something to say; skipping or scoring badly leaves the
// session exactly where it was.
export const SessionQuiz = ({
  sessionId,
  onSkip,
  onFinished,
}: {
  sessionId: string;
  onSkip: () => void;
  onFinished: (result: QuizResult) => void;
}) => {
  const {
    quiz,
    answer,
    finish,
    progress: latestProgress,
  } = useSessionQuiz(sessionId);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cue = useAnswerCue();
  const questions = quiz.data?.questions ?? [];
  const question = questions[index];
  const progress = question
    ? latestProgress?.cardId === question.cardId
      ? latestProgress
      : (quiz.data?.attempts?.[question.cardId] ?? null)
    : null;
  const answered = !!progress && !answer.isPending;
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
    if (answer.isPending || picked !== null || answered) return;
    setPicked(optionIndex);
    setError(null);
    answer.mutate(
      { cardId: question.cardId, optionIndex },
      {
        onSuccess: (result) => cue(result.correct, result.correctSoFar - 1),
        onError: () => {
          setPicked(null);
          setError('Could not check that answer. Try again, or skip.');
        },
      },
    );
  };

  // The server says which option was right only once one is picked. A
  // question answered before a reload shows the answer and dims the rest.
  const correctIndex =
    answered && progress
      ? question.options.indexOf(progress.correctAnswer)
      : null;
  const stateOf = (optionIndex: number): ChoiceState => {
    if (answered && picked === null)
      return optionIndex === correctIndex ? 'answer' : 'dim';
    return choiceState({
      index: optionIndex,
      picked,
      correct: correctIndex,
    });
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

  const raised = multiplier > 1;

  return (
    <TimerFrame
      label="Quiz"
      top={
        <div className="flex items-baseline justify-between">
          <p className="text-[0.9375rem] text-muted">
            <span className="font-mono tabular-nums">
              {index + 1} of {questions.length}
            </span>
            <span> · optional</span>
          </p>
          <p
            key={multiplier}
            className={
              raised
                ? 'spring-pop font-mono text-2xl text-focus tabular-nums'
                : 'font-mono text-base text-muted tabular-nums'
            }
            aria-live="polite"
            aria-label={`Bonus multiplier ${multiplier.toFixed(1)}`}
          >
            ×{multiplier.toFixed(1)}
          </p>
        </div>
      }
      actions={
        <div className="space-y-2">
          {answered ? (
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
        <p className="text-sm text-muted">
          {progress
            ? `${progress.correctSoFar} right so far. Up to ×${MAX_QUIZ_MULTIPLIER.toFixed(1)} on this session's Focus.`
            : `Optional. Skipping keeps what you earned. Answer ${questions.length} questions from your own notes for up to ×${MAX_QUIZ_MULTIPLIER.toFixed(1)} on this session's Focus.`}
        </p>
        <p className="text-xl leading-relaxed text-ink">{question.question}</p>
        <ol className="space-y-2.5" aria-label="Options">
          {question.options.map((option, optionIndex) => (
            <li key={optionIndex}>
              <ChoiceButton
                index={optionIndex}
                state={stateOf(optionIndex)}
                disabled={picked !== null || answered}
                onPick={() => choose(optionIndex)}
              >
                {option}
              </ChoiceButton>
            </li>
          ))}
        </ol>
        {answered && progress ? (
          <AnswerVerdict correct={progress.correct}>
            {progress.explanation && (
              <p className="leading-relaxed text-ink-2">
                {progress.explanation}
              </p>
            )}
            <blockquote className="border-l-2 border-hairline pl-3 text-sm text-ink-2">
              {progress.sourceQuote}
            </blockquote>
            {!progress.correct && (
              <p className="text-sm text-ink-2">Your earned Focus is safe.</p>
            )}
          </AnswerVerdict>
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

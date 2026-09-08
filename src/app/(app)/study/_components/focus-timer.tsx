'use client';

import { useCallback, useState } from 'react';
import { useProfile } from '@/app/(app)/_hooks/use-profile';
import { useStats } from '@/app/(app)/_hooks/use-stats';
import type { QuizResult as QuizResultData } from '@/domain/types';
import { useElapsed } from '../_hooks/use-elapsed';
import { useFocusFlag } from '../_hooks/use-focus-flag';
import { useFocusSession } from '../_hooks/use-focus-session';
import { IdleView } from './idle-view';
import { LoadingView } from './loading-view';
import { QuizResult } from './quiz-result';
import { RunningView } from './running-view';
import { SessionQuiz } from './session-quiz';
import { SessionResult } from './session-result';

type Phase = 'timer' | 'quiz' | 'quiz-result';

// The only client component on /study. Everything above it stays on the server.
// Ending a session goes timer -> quiz (optional) -> result. The quiz runs
// before /api/session/end so the payout is computed once, multiplier included.
export const FocusTimer = () => {
  const { status, session, focusedMs, result, error, start, end, reset } =
    useFocusSession();
  const { data } = useStats();
  const { data: profile } = useProfile();
  const isFocused = useFocusFlag();
  const [phase, setPhase] = useState<Phase>('timer');
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);
  const active = status === 'running' || status === 'ending';
  const elapsedMs = useElapsed(session?.startedAt ?? null, active);

  const finish = useCallback(() => {
    setPhase('timer');
    void end();
  }, [end]);

  if (status === 'loading') return <LoadingView />;

  if (status === 'ended' && result) {
    return (
      <SessionResult
        result={result}
        quiz={quizResult}
        onDone={() => {
          setQuizResult(null);
          reset();
        }}
      />
    );
  }

  if (!active) {
    return (
      <IdleView
        creditedTodayMs={data?.today.creditedMs ?? 0}
        streakDays={data?.stats.streakDays ?? 0}
        firstVisit={data?.stats.lastSessionDate === null}
        starting={status === 'starting'}
        error={error}
        onStart={() => void start()}
      />
    );
  }

  if (phase === 'quiz' && session && status === 'running') {
    return (
      <SessionQuiz
        sessionId={session.sessionId}
        onSkip={finish}
        onFinished={(outcome) => {
          setQuizResult(outcome);
          setPhase('quiz-result');
        }}
      />
    );
  }

  if (phase === 'quiz-result' && quizResult && status === 'running') {
    return (
      <QuizResult result={quizResult} onContinue={finish} continuing={false} />
    );
  }

  return (
    <RunningView
      elapsedMs={elapsedMs}
      focusedMs={focusedMs}
      isFocused={isFocused}
      ending={status === 'ending'}
      error={error}
      breakReminderMs={profile?.breakReminderMs ?? undefined}
      onEnd={() => setPhase('quiz')}
    />
  );
};

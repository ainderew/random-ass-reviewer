'use client';

import { useCallback, useState } from 'react';
import { useProfile } from '@/app/(app)/_hooks/use-profile';
import { useStats } from '@/app/(app)/_hooks/use-stats';
import { newlyEarned, type CareerProgress } from '@/domain/career/milestones';
import { aimById, defaultAim } from '@/domain/island/aim';
import type { QuizResult as QuizResultData } from '@/domain/types';
import { useElapsed } from '../_hooks/use-elapsed';
import { useFocusFlag } from '../_hooks/use-focus-flag';
import { useFocusSession } from '../_hooks/use-focus-session';
import { useSessionPreferences } from '../_hooks/use-session-preferences';
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
  const prefs = useSessionPreferences();
  const isFocused = useFocusFlag();
  const [phase, setPhase] = useState<Phase>('timer');
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);
  const [careerBefore, setCareerBefore] = useState<CareerProgress | null>(null);
  const active = status === 'running' || status === 'ending';
  const elapsedMs = useElapsed(session?.startedAt ?? null, active);

  const career = data?.career ?? {
    focusMs: 0,
    highGrades: 0,
    cardsRecalled: 0,
  };
  const level = data?.stats.level ?? 1;
  const focusBalance = data?.stats.focusBalance ?? 0;
  const aim =
    (prefs.aimAssetId ? aimById(prefs.aimAssetId, level) : null) ??
    defaultAim(level, focusBalance);
  const lengthMs = prefs.length === null ? null : prefs.length * 60_000;

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
        milestones={careerBefore ? newlyEarned(careerBefore, career) : []}
        onDone={() => {
          setQuizResult(null);
          setCareerBefore(null);
          reset();
        }}
      />
    );
  }

  if (!active) {
    return (
      <IdleView
        creditedTodayMs={data?.today.creditedMs ?? 0}
        todaySessions={data?.today.sessions ?? []}
        career={career}
        streakDays={data?.stats.streakDays ?? 0}
        firstVisit={data?.stats.lastSessionDate === null}
        focusBalance={focusBalance}
        level={level}
        aim={aim}
        onAimChange={prefs.setAim}
        length={prefs.length}
        onLengthChange={prefs.setLength}
        starting={status === 'starting'}
        error={error}
        onStart={() => {
          setCareerBefore(career);
          void start();
        }}
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
      lengthMs={lengthMs}
      aim={aim}
      career={career}
      focusBalance={focusBalance}
      level={level}
      ending={status === 'ending'}
      error={error}
      breakReminderMs={profile?.breakReminderMs ?? undefined}
      onEnd={() => setPhase('quiz')}
    />
  );
};

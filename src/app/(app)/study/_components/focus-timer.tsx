'use client';

import { useCallback, useState } from 'react';
import { useProfile } from '@/app/(app)/_hooks/use-profile';
import { useStats } from '@/app/(app)/_hooks/use-stats';
import { newlyEarned, type CareerProgress } from '@/domain/career/milestones';
import { aimById, defaultAim } from '@/domain/island/aim';
import { MAX_SESSION_MS } from '@/domain/session/elapsed';
import type { QuizResult as QuizResultData } from '@/domain/types';
import { useElapsed } from '../_hooks/use-elapsed';
import { useFocusSession } from '../_hooks/use-focus-session';
import {
  useFocusSound,
  useFocusSoundPlayback,
  wakeFocusSound,
} from '../_hooks/use-focus-sound';
import { usePet } from '../_hooks/use-pet';
import { useSessionPreferences } from '../_hooks/use-session-preferences';
import { useWakeLock } from '../_hooks/use-wake-lock';
import { FocusIdle } from './focus-idle';
import { LoadingView } from './loading-view';
import { QuizResult } from './quiz-result';
import { RunningView } from './running-view';
import { SessionQuiz } from './session-quiz';
import { SessionResult } from './session-result';

type Phase = 'timer' | 'quiz' | 'quiz-result';

// The Focus tab, /focus. Everything above it stays on the server.
// Ending a session goes timer -> quiz (optional) -> result. The quiz runs
// before /api/session/end so the payout is computed once, multiplier included.
export const FocusTimer = () => {
  const { status, session, focusedMs, result, error, start, end, reset } =
    useFocusSession();
  const { data } = useStats();
  const { data: profile } = useProfile();
  const { data: pet } = usePet();
  const prefs = useSessionPreferences();
  const [chosenPhase, setPhase] = useState<Phase>('timer');
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);
  const [careerBefore, setCareerBefore] = useState<CareerProgress | null>(null);
  const active = status === 'running' || status === 'ending';
  // At the two-hour limit the session has nothing more to count: it closes
  // the usual way, quiz first.
  const full = status === 'running' && focusedMs >= MAX_SESSION_MS;
  const phase: Phase = full && chosenPhase === 'timer' ? 'quiz' : chosenPhase;
  const elapsedMs = useElapsed(session?.startedAt ?? null, active);
  const { mix } = useFocusSound();
  // The mix plays with the timer and stops for the quiz: recall is best in
  // quiet.
  useFocusSoundPlayback(active && phase === 'timer');
  // The screen stays on; leaving the app is fine, time counts regardless.
  useWakeLock(active);

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
      <FocusIdle
        career={career}
        pet={pet}
        length={prefs.length}
        onLengthChange={prefs.setLength}
        starting={status === 'starting'}
        error={error}
        onStart={() => {
          wakeFocusSound(mix);
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
      lengthMs={lengthMs}
      aim={aim}
      career={career}
      focusBalance={focusBalance}
      level={level}
      ending={status === 'ending'}
      error={error}
      breakReminderMs={profile?.breakReminderMs ?? undefined}
      pet={pet}
      onEnd={() => setPhase('quiz')}
    />
  );
};

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useProfile } from '@/app/(app)/_hooks/use-profile';
import { useStats } from '@/app/(app)/_hooks/use-stats';
import { newlyEarned, type CareerProgress } from '@/domain/career/milestones';
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
  const lengthMs = prefs.length === null ? null : prefs.length * 60_000;

  // A session recovered already past its chosen length was finished while she
  // was in another app (the tab was backgrounded or discarded, so nothing
  // here could press End). Bank it and feed the cat instead of resuming a
  // stale timer she has to end by hand. A freshly started session sits at ~0,
  // and one that crosses the line while she is watching keeps the usual
  // "save or keep going" choice. Open-ended sessions have no line to cross.
  const autoCollectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (status !== 'running' || !session) return;
    if (autoCollectedRef.current === session.sessionId) return;
    autoCollectedRef.current = session.sessionId;
    if (lengthMs !== null && focusedMs >= lengthMs) {
      void end();
    }
  }, [status, session, focusedMs, lengthMs, end]);

  const finish = useCallback(() => {
    setPhase('timer');
    void end();
  }, [end]);

  if (status === 'loading') return <LoadingView />;

  if (status === 'ended' && result) {
    return (
      <SessionResult
        result={result}

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
      career={career}
      ending={status === 'ending'}
      error={error}
      breakReminderMs={profile?.breakReminderMs ?? undefined}
      pet={pet}
      onEnd={() => setPhase('quiz')}
    />
  );
};

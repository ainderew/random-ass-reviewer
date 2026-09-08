'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HEARTBEAT_INTERVAL_MS } from '@/domain/session/constants';
import type { SessionResult, SessionSnapshot } from '@/domain/types';
import { ApiError } from '@/lib/api-client';
import { statsQueryKey } from '@/lib/query-keys';
import { withRetry } from '@/lib/retry';
import {
  fetchActiveSession,
  requestEndSession,
  requestStartSession,
  sendHeartbeat,
} from './session-api';
import { readFocus } from './use-focus-flag';

export type SessionStatus =
  'loading' | 'idle' | 'starting' | 'running' | 'ending' | 'ended';

const isGone = (error: unknown) =>
  error instanceof ApiError &&
  (error.code === 'INVALID_STATE' || error.code === 'NOT_FOUND');

export function useFocusSession() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [focusedMs, setFocusedMs] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // seq and sessionId live in refs: the interval callback reads them, and a
  // state value would be frozen at the first render.
  const seqRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  const invalidateStats = useCallback(
    () => queryClient.invalidateQueries({ queryKey: statsQueryKey }),
    [queryClient],
  );

  const adopt = useCallback((snapshot: SessionSnapshot) => {
    sessionIdRef.current = snapshot.sessionId;
    seqRef.current = (snapshot.lastSeq ?? -1) + 1;
    setSession(snapshot);
    setFocusedMs(snapshot.focusedMs);
    setResult(null);
    setStatus('running');
  }, []);

  const drop = useCallback(() => {
    sessionIdRef.current = null;
    setSession(null);
    setStatus('idle');
    void invalidateStats();
  }, [invalidateStats]);

  // Recovery: a refresh or crash resumes the in-flight session.
  useEffect(() => {
    let cancelled = false;
    fetchActiveSession()
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot) adopt(snapshot);
        else setStatus('idle');
      })
      .catch(() => {
        if (!cancelled) setStatus('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  const beat = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    const seq = seqRef.current;
    seqRef.current += 1;
    try {
      const response = await sendHeartbeat({
        sessionId,
        seq,
        focused: readFocus(),
      });
      setFocusedMs(response.focusedMs);
    } catch (caught) {
      // Network blips are silent; the gap rule bounds the loss.
      if (isGone(caught)) drop();
    }
  }, [drop]);

  // Hidden tabs throttle this to ~1/min. That is correct: a hidden tab is not
  // focused time, and the server would not credit a fast cadence anyway.
  useEffect(() => {
    if (status !== 'running') return;
    void beat();
    const id = setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, beat]);

  const start = useCallback(async () => {
    setError(null);
    setStatus('starting');
    try {
      adopt(await requestStartSession());
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not start. Try again.',
      );
      setStatus('idle');
    }
  }, [adopt]);

  const end = useCallback(async (): Promise<SessionResult | null> => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return null;
    setStatus('ending');
    try {
      const outcome = await withRetry(() => requestEndSession(sessionId), {
        shouldRetry: (caught) =>
          !(caught instanceof ApiError) || caught.status >= 500,
      });
      sessionIdRef.current = null;
      setResult(outcome);
      setStatus('ended');
      void invalidateStats();
      return outcome;
    } catch (caught) {
      if (isGone(caught)) {
        drop();
        return null;
      }
      // Keep the timer on screen. The stale sweeper will save it if we cannot.
      setError(
        'Could not reach the server. Your time is saved; it will be credited automatically, or press End again.',
      );
      setStatus('running');
      return null;
    }
  }, [drop, invalidateStats]);

  const reset = useCallback(() => {
    setResult(null);
    setSession(null);
    setError(null);
    setStatus('idle');
  }, []);

  return { status, session, focusedMs, result, error, start, end, reset };
}

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HEARTBEAT_INTERVAL_MS } from '@/domain/session/constants';
import type {
  SessionResult,
  SessionSnapshot,
  StartSessionRequest,
} from '@/domain/types';
import { ApiError } from '@/lib/api-client';
import { petQueryKey, statsQueryKey } from '@/lib/query-keys';
import { withRetry } from '@/lib/retry';
import {
  fetchActiveSession,
  requestEndSession,
  requestStartSession,
  sendHeartbeat,
} from './session-api';

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
  // The interval callback reads the id, and a state value would be frozen at
  // the first render.
  const sessionIdRef = useRef<string | null>(null);

  const invalidateStats = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: statsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['today-plan'] }),
        // The cat's kibble and happiness come from the session too.
        queryClient.invalidateQueries({ queryKey: petQueryKey }),
      ]),
    [queryClient],
  );

  const adopt = useCallback((snapshot: SessionSnapshot) => {
    sessionIdRef.current = snapshot.sessionId;
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
        else {
          setStatus('idle');
          // The active-session read may have settled a session past its limit.
          void invalidateStats();
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [adopt, invalidateStats]);

  // A check-in refreshes the time counted so far. It is only a read: time
  // counts on the server clock, in the background too.
  const sync = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      const response = await sendHeartbeat({ sessionId });
      setFocusedMs(response.focusedMs);
    } catch (caught) {
      // Network blips are silent; nothing is lost while offline.
      if (isGone(caught)) drop();
    }
  }, [drop]);

  // Every 15 seconds while running, and straight away on coming back to the
  // tab, so the numbers catch up after time spent in another app.
  useEffect(() => {
    if (status !== 'running') return;
    void sync();
    const id = setInterval(() => void sync(), HEARTBEAT_INTERVAL_MS);
    const onReturn = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [status, sync]);

  const start = useCallback(
    async (options?: StartSessionRequest) => {
      setError(null);
      setStatus('starting');
      try {
        adopt(await requestStartSession(options));
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Could not start. Try again.',
        );
        setStatus('idle');
      }
    },
    [adopt],
  );

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
      // Keep the timer on screen. The time keeps counting on the server.
      setError(
        'Could not reach the server. Your time is still counting; press End again in a moment.',
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

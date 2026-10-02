import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { HEARTBEAT_INTERVAL_MS } from '@/domain/session/constants';
import { useFocusSession } from './use-focus-session';

type Call = { path: string; body: Record<string, unknown> | null };
const calls: Call[] = [];
let active: unknown = null;

const respond = (data: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ data }),
});

beforeEach(() => {
  calls.length = 0;
  active = null;
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const body = init?.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : null;
      calls.push({ path, body });
      if (path === '/api/session/active') return respond(active);
      if (path === '/api/session/start')
        return respond({
          sessionId: 's1',
          startedAt: new Date().toISOString(),
          focusedMs: 0,
        });
      if (path === '/api/session/beat') return respond({ focusedMs: 15_000 });
      if (path === '/api/session/end')
        return respond({
          sessionId: 's1',
          focusedMs: 0,
          creditedMs: 0,
          focusAwarded: 0,
          xpAwarded: 0,
          quizMultiplier: 1,
          cappedByDailyLimit: false,
          belowMinimum: true,
          levelUp: null,
          streak: null,
          cache: null,
        });
      throw new Error(`Unmocked route ${path}`);
    },
  ) as unknown as typeof fetch;
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

const beats = () => calls.filter((c) => c.path === '/api/session/beat');

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useFocusSession', () => {
  it('checks in every interval with nothing but the session id', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useFocusSession(), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('running');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3 + 10);
    });
    expect(beats()).toHaveLength(4);
    // No time, no focus flag: the server counts on its own clock.
    for (const beat of beats()) expect(beat.body).toEqual({ sessionId: 's1' });
    expect(result.current.focusedMs).toBe(15_000);
  });

  it('catches up straight away on coming back from another app', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useFocusSession(), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
      await result.current.start();
    });
    const before = beats().length;
    await act(async () => {
      setVisibility('hidden');
      setVisibility('visible');
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(beats()).toHaveLength(before + 1);
    expect(result.current.status).toBe('running');
  });

  it('resumes an in-flight session after a reload', async () => {
    active = {
      sessionId: 's9',
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      focusedMs: 45_000,
    };
    const { result } = renderHook(() => useFocusSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('running'));
    await waitFor(() => expect(beats()).toHaveLength(1));
    expect(beats()[0]!.body).toEqual({ sessionId: 's9' });
    expect(calls.some((c) => c.path === '/api/session/start')).toBe(false);
    // The first check-in's reply replaces the snapshot's count.
    expect(result.current.focusedMs).toBe(15_000);
  });

  it('ends with the result and stops beating', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useFocusSession(), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
      await result.current.start();
    });
    await act(async () => {
      await result.current.end();
    });
    expect(result.current.status).toBe('ended');
    expect(result.current.result?.sessionId).toBe('s1');
    const count = beats().length;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2);
    });
    expect(beats()).toHaveLength(count);
  });
});

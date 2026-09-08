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
          lastSeq: null,
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
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
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

describe('useFocusSession', () => {
  it('sends a heartbeat every interval with a sequence that only ever climbs', async () => {
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
    const seqs = beats().map((b) => b.body?.seq);
    expect(seqs).toEqual([0, 1, 2, 3]);
    for (const beat of beats())
      expect(Object.keys(beat.body ?? {})).not.toContain('elapsedMs');
  });

  it('reports focused: false once the tab is hidden', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useFocusSession(), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
      await result.current.start();
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 10);
    });
    const last = beats().at(-1);
    expect(last?.body).toMatchObject({ focused: false });
  });

  it('resumes an in-flight session and continues its sequence', async () => {
    active = {
      sessionId: 's9',
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      focusedMs: 45_000,
      lastSeq: 7,
    };
    const { result } = renderHook(() => useFocusSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('running'));
    await waitFor(() => expect(beats()).toHaveLength(1));
    expect(beats()[0]!.body).toMatchObject({ sessionId: 's9', seq: 8 });
    expect(calls.some((c) => c.path === '/api/session/start')).toBe(false);
    // The first beat's reply replaces the snapshot's focused time.
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

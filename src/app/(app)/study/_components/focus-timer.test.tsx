import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { statsQueryKey } from '@/lib/query-keys';
import { FocusTimer } from './focus-timer';

const snapshot = {
  stats: {
    userId: 'u1',
    focusBalance: 0,
    insightBalance: 0,
    xp: 0,
    level: 1,
    streakDays: 3,
    streakFreezes: 2,
    lastSessionDate: '2026-09-07',
  },
  today: { creditedMs: 25 * 60_000, sessionsStarted: 1 },
};

const activeSession = {
  sessionId: 's1',
  startedAt: new Date(Date.now() - 90_000).toISOString(),
  focusedMs: 60_000,
  lastSeq: 5,
};

const sessionResult = {
  sessionId: 's1',
  focusedMs: 600_000,
  creditedMs: 600_000,
  focusAwarded: 100,
  xpAwarded: 100,
  quizMultiplier: 1,
  cappedByDailyLimit: false,
  belowMinimum: false,
  levelUp: null,
  streak: null,
  cache: null,
};

type Route = { data: unknown };
const routes: Record<string, () => Route> = {};
const calls: { path: string; body: unknown }[] = [];

function respond(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ data }),
  };
}

beforeEach(() => {
  calls.length = 0;
  routes['/api/session/active'] = () => ({ data: null });
  routes['/api/session/start'] = () => ({
    data: {
      sessionId: 's1',
      startedAt: new Date().toISOString(),
      focusedMs: 0,
      lastSeq: null,
    },
  });
  routes['/api/session/beat'] = () => ({ data: { focusedMs: 15_000 } });
  routes['/api/session/end'] = () => ({ data: sessionResult });
  // A new user has no seen cards: no quiz, straight to the reward.
  routes['/api/review/session-quiz?sessionId=s1'] = () => ({
    data: { sessionId: 's1', questions: [], submitted: false },
  });
  routes['/api/stats'] = () => ({ data: snapshot });
  routes['/api/me'] = () => ({
    data: {
      timeZone: 'UTC',
      onboardedAt: '2026-09-01T00:00:00Z',
      dailyCapMs: null,
      breakReminderMs: null,
      progress: { hasNotes: true, hasSession: true, hasPlacement: true },
    },
  });
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      calls.push({
        path,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      const route = routes[path];
      if (!route) throw new Error(`Unmocked route ${path}`);
      return respond(route().data);
    },
  ) as unknown as typeof fetch;
  jest.spyOn(document, 'hasFocus').mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(statsQueryKey, snapshot);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('FocusTimer', () => {
  it('shows today and a start button once no session is in flight', async () => {
    render(<FocusTimer />, { wrapper });

    expect(
      await screen.findByRole('button', { name: 'Start focusing' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('25 min credited today. 3-day streak.'),
    ).toBeInTheDocument();
  });

  it('clicking Start shows a running timer and sends the first heartbeat', async () => {
    render(<FocusTimer />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start focusing' }),
    );

    expect(
      await screen.findByRole('button', { name: 'End session' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('elapsed')).toHaveTextContent(/^00:0\d$/);
    expect(await screen.findByRole('status')).toHaveTextContent('Focused');

    const beat = calls.find((c) => c.path === '/api/session/beat');
    expect(beat?.body).toEqual({ sessionId: 's1', seq: 0, focused: true });
    expect(Object.keys(beat?.body as object)).not.toContain('elapsedMs');
  });

  it('switching tabs shows the Away indicator, and coming back clears it', async () => {
    render(<FocusTimer />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start focusing' }),
    );
    await screen.findByRole('button', { name: 'End session' });

    setVisibility('hidden');
    expect(screen.getByRole('status')).toHaveTextContent('Away, not counting');

    setVisibility('visible');
    expect(screen.getByRole('status')).toHaveTextContent('Focused');
  });

  it('resumes an in-flight session and continues the heartbeat sequence', async () => {
    routes['/api/session/active'] = () => ({ data: activeSession });
    render(<FocusTimer />, { wrapper });

    expect(
      await screen.findByRole('button', { name: 'End session' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('elapsed')).toHaveTextContent(/^01:3\d$/);
    const beat = calls.find((c) => c.path === '/api/session/beat');
    expect(beat?.body).toMatchObject({ sessionId: 's1', seq: 6 });
  });

  it('ending shows the credited result', async () => {
    render(<FocusTimer />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start focusing' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'End session' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Session saved' }),
    ).toBeInTheDocument();
    expect(screen.getByText('10 min credited')).toBeInTheDocument();
    expect(screen.getByText('+100')).toBeInTheDocument();
    expect(screen.getByText('+100 XP')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/api/session/end')?.body).toEqual({
      sessionId: 's1',
    });
  });
});

describe('FocusTimer quiz step', () => {
  const quiz = {
    sessionId: 's1',
    questions: [
      {
        cardId: 'c1',
        question: 'Which nerve is CN VII?',
        options: ['Facial', 'Trigeminal', 'Vagus', 'Optic'],
      },
    ],
    submitted: false,
  };

  it('offers the quiz with a visible Skip, and skipping ends the session with no bonus', async () => {
    routes['/api/review/session-quiz?sessionId=s1'] = () => ({ data: quiz });
    render(<FocusTimer />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start focusing' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'End session' }),
    );

    expect(
      await screen.findByText('Which nerve is CN VII?'),
    ).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/api/session/end')).toBeUndefined();
    await userEvent.click(
      screen.getByRole('button', { name: 'Skip, keep my Focus as is' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Session saved' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/quiz bonus/)).not.toBeInTheDocument();
  });

  it('grades each answer on the server, then ends the session with the bonus applied', async () => {
    routes['/api/review/session-quiz?sessionId=s1'] = () => ({ data: quiz });
    routes['/api/review/session-quiz/answer'] = () => ({
      data: {
        correct: true,
        correctSoFar: 1,
        answered: 1,
        total: 1,
        multiplier: 2,
      },
    });
    routes['/api/review/session-quiz'] = () => ({
      data: { multiplier: 2, insightAwarded: 3, correct: 1, total: 1 },
    });
    routes['/api/session/end'] = () => ({
      data: { ...sessionResult, focusAwarded: 200, quizMultiplier: 2 },
    });
    render(<FocusTimer />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Start focusing' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'End session' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Facial' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Right.');
    expect(screen.getByLabelText('Bonus multiplier 2.0')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'See my bonus' }));
    expect(
      await screen.findByRole('heading', { name: '1 of 1' }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Open your reward' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Session saved' }),
    ).toBeInTheDocument();
    expect(screen.getByText('+200')).toBeInTheDocument();
    expect(screen.getByText(/×2.00 quiz bonus/)).toBeInTheDocument();
    const answer = calls.find(
      (c) => c.path === '/api/review/session-quiz/answer',
    );
    expect(answer?.body).toEqual({
      sessionId: 's1',
      cardId: 'c1',
      optionIndex: 0,
    });
  });
});

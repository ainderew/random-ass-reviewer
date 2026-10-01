import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { PetView } from '@/domain/types';
import { TodayView } from './today-view';

jest.mock('./character-view', () => ({ CharacterView: () => null }));

const MIN = 60_000;
const toys: PetView['toys'] = [
  {
    id: 'brush',
    label: 'Soft brush',
    unlocked: false,
    need: '3 quizzes at 75% or better',
  },
  {
    id: 'wand',
    label: 'Feather wand',
    unlocked: true,
    need: '2 hours of focus',
  },
  {
    id: 'mouse',
    label: 'Crinkle mouse',
    unlocked: false,
    need: '150 cards remembered',
  },
  { id: 'yarn', label: 'Yarn ball', unlocked: false, need: '8 hours of focus' },
];
const basePet: PetView = {
  name: 'Toast',
  coat: 'ginger',
  grams: 3_600,
  roundness: 0,
  stage: 'Slim',
  happiness: 70,
  mood: 'happy',
  missesYou: false,
  kibble: { bowls: 1, minutesToNext: 10 },
  treats: 0,
  toys,
};
const batches = (total: number) => ({
  5: { total: Math.min(total, 6), returning: 0, fresh: 0 },
  15: { total, returning: 0, fresh: 0 },
  30: { total, returning: 0, fresh: 0 },
});

let pet: PetView;
let plan: Record<string, unknown>;
let creditedMs: number;
let active: unknown;
const calls: { path: string; method: string; body: unknown }[] = [];

beforeEach(() => {
  localStorage.clear();
  calls.length = 0;
  pet = { ...basePet };
  plan = {
    batches: batches(18),
    reviewedToday: 0,
    approved: 40,
    mistakesDue: 0,
    nextMistakeAt: null,
    examMonth: null,
  };
  creditedMs = 0;
  active = null;
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ path, method, body });
      const routes: Record<string, () => unknown> = {
        'GET /api/pet': () => pet,
        'GET /api/study-plan/today': () => plan,
        'GET /api/session/active': () => active,
        'GET /api/push/subscription': () => ({ publicKey: null, devices: 0 }),
        'GET /api/me': () => ({ timeZone: 'Asia/Manila' }),
        'GET /api/stats': () => ({
          stats: { level: 1, focusBalance: 0 },
          today: { creditedMs, sessionsStarted: 0, sessions: [] },
          career: { focusMs: 0, highGrades: 0, cardsRecalled: 0 },
        }),
        'POST /api/pet/care': () => {
          pet = {
            ...pet,
            grams: 3_700,
            happiness: 76,
            kibble: { bowls: 0, minutesToNext: 10 },
          };
          return {
            pet,
            action: body.action,
            toy: body.toy ?? null,
            happinessRaised: true,
          };
        },
      };
      const route = routes[`${method} ${path}`];
      if (!route) throw new Error(`Unmocked route ${method} ${path}`);
      const data = route();
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data }),
      };
    },
  ) as unknown as typeof fetch;
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe('TodayView', () => {
  it('has the cat say the next step, with one button to do it', async () => {
    render(<TodayView />, { wrapper });
    expect(
      await screen.findByText('18 cards to review first.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start review' })).toHaveAttribute(
      'href',
      '/review?minutes=15',
    );
    const steps = within(
      screen.getByRole('list', { name: "Today's plan" }),
    ).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual([
      expect.stringContaining('Review cards'),
      expect.stringContaining('Focus with Toast'),
    ]);
  });

  it('lets the review be smaller, and remembers it', async () => {
    render(<TodayView />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: '18 cards. Change how many' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Up to 6' }));
    expect(screen.getByRole('link', { name: 'Start review' })).toHaveAttribute(
      'href',
      '/review?minutes=5',
    );
    expect(localStorage.getItem('aloft:review-minutes')).toBe('5');
  });

  it('points at focus once the cards are done', async () => {
    plan = { ...plan, batches: batches(0), reviewedToday: 12 };
    creditedMs = 10 * MIN;
    render(<TodayView />, { wrapper });
    expect(
      await screen.findByText('10 of 25 min of focus so far. More?'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Start focusing' }),
    ).toHaveAttribute('href', '/focus');
  });

  it('sends you back to a session that is still running', async () => {
    active = {
      sessionId: 's1',
      startedAt: new Date().toISOString(),
      focusedMs: 0,
      lastSeq: 0,
    };
    render(<TodayView />, { wrapper });
    expect(
      await screen.findByRole('link', { name: 'Back to your session' }),
    ).toHaveAttribute('href', '/focus');
  });

  it('has nothing left to press when the day is done', async () => {
    plan = { ...plan, batches: batches(0), reviewedToday: 18 };
    creditedMs = 30 * MIN;
    render(<TodayView />, { wrapper });
    expect(
      await screen.findByText("That's today. I'm proud of you."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Start/ })).toBeNull();
  });

  it('feeds her from the bowl the server says is waiting', async () => {
    render(<TodayView />, { wrapper });
    const care = await screen.findByRole('list', { name: 'Care for Toast' });
    await userEvent.click(
      within(care).getByRole('button', { name: 'Feed Toast, 1 left' }),
    );
    await waitFor(() =>
      expect(calls).toContainEqual({
        path: '/api/pet/care',
        method: 'POST',
        body: { action: 'feed' },
      }),
    );
  });

  it('keeps locked care quiet', async () => {
    render(<TodayView />, { wrapper });
    const care = await screen.findByRole('list', { name: 'Care for Toast' });
    const brush = within(care).getByRole('button', {
      name: 'Brush Toast, locked',
    });
    await userEvent.click(brush);
    expect(calls.some((c) => c.path === '/api/pet/care')).toBe(false);
  });

  it('opens her sheet from her name, and closes it with Escape', async () => {
    render(<TodayView />, { wrapper });
    await userEvent.click(
      await screen.findByRole('button', { name: /Toast.*Happy/ }),
    );
    const sheet = screen.getByRole('dialog', { name: 'Toast' });
    expect(within(sheet).getByLabelText("Your cat's name")).toHaveValue(
      'Toast',
    );
    expect(
      within(sheet).getByRole('list', { name: 'Care for Toast' }),
    ).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says she missed you after a long day apart', async () => {
    pet = { ...basePet, missesYou: true, happiness: 30, mood: 'lonely' };
    render(<TodayView />, { wrapper });
    expect(
      await screen.findByText('I missed you! 18 cards to review first.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /Toast is waiting for you\. She looks lonely\.$/,
    );
  });
});

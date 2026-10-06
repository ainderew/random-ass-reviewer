import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { AnswerResult, QueuedCard, ReviewStats } from '@/domain/types';
import { reviewQueueFor, reviewStatsKey } from '@/lib/query-keys';
import { ReviewSession } from './review-session';

jest.mock('@/game/systems/juice/play-pitched', () => ({
  playPitched: jest.fn(),
}));

const card = (id: string, question: string): QueuedCard => ({
  id,
  question,
  answer: `Answer for ${question}`,
  sourceQuote: 'a verbatim quote',
  tags: ['medium'],
  isNew: true,
  dueAt: new Date('2026-09-08T00:00:00Z'),
  intervals: { 1: 0.0007, 2: 0.004, 3: 0.007, 4: 4 },
});

const QUEUE = [
  card('11111111-1111-4111-8111-111111111111', 'First question?'),
  card('22222222-2222-4222-8222-222222222222', 'Second question?'),
];

const STATS: ReviewStats = {
  dueNow: 2,
  nextDueAt: null,
  reviewedToday: 0,
  retention: null,
  forecast: [],
  totals: { total: 2, new: 2, learning: 0, mature: 0 },
};

const answer: AnswerResult = {
  cardId: QUEUE[0]!.id,
  rating: 3,
  nextDueAt: new Date(),
  intervalDays: 0.007,
  insightAwarded: 3,
  consecutiveCorrect: 1,
  insightBalance: 3,
};

function renderSession(
  queue: QueuedCard[] = QUEUE,
  stats: ReviewStats = STATS,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(reviewQueueFor(), queue);
  client.setQueryData(reviewStatsKey, stats);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ReviewSession />, { wrapper });
}

// URL-aware: the stats query refetches on mount and must get stats back.
const respond = (data: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ data }),
});
const routeResponse = (input: RequestInfo | URL) =>
  String(input) === '/api/review/stats' ? respond(STATS) : respond(answer);

describe('ReviewSession', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) =>
      routeResponse(input),
    ) as unknown as typeof fetch;
  });

  it('pressing Space reveals the answer with its source quote and labelled intervals', async () => {
    renderSession();
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Rate your recall' }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('region', { name: 'Answer' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Source' }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard(' ');

    expect(
      screen.getByRole('group', { name: 'Rate your recall' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/a verbatim quote/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Good, next in 10 min' }),
    ).toBeInTheDocument();
  });

  it('pressing 3 rates Good, posts the rating, and advances', async () => {
    renderSession();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('3');

    await waitFor(() =>
      expect(screen.getByText('Second question?')).toBeInTheDocument(),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/review/answer',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"rating":3'),
      }),
    );
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('queues a failed answer, keeps moving, and retries it later', async () => {
    // The first two saves fail (the answer and its immediate retry); the
    // network is back after that. Other requests are unaffected.
    let answerCalls = 0;
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/review/answer') {
        answerCalls += 1;
        if (answerCalls <= 2) throw new TypeError('Failed to fetch');
      }
      return routeResponse(input);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderSession();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('3');

    await waitFor(() =>
      expect(screen.getByText('Second question?')).toBeInTheDocument(),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      '1 answer waiting to save',
    );
    // The next answer joins the queue, which then drains in order.
    await userEvent.keyboard(' ');
    await userEvent.keyboard('3');
    await waitFor(() => expect(answerCalls).toBeGreaterThanOrEqual(4));
    expect(await screen.findByText('Deck cleared')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
  });

  it('tells "no cards" apart from "caught up"', () => {
    const { unmount } = renderSession([], {
      ...STATS,
      totals: { total: 0, new: 0, learning: 0, mature: 0 },
    });
    expect(screen.getByText('No approved cards yet')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Check notes and cards' }),
    ).toHaveAttribute('href', '/notes');
    unmount();

    renderSession([], {
      ...STATS,
      dueNow: 0,
      nextDueAt: new Date(Date.now() + 3 * 86_400_000),
    });
    expect(screen.getByText("You're caught up")).toBeInTheDocument();
    expect(screen.getByText(/Next review/)).toBeInTheDocument();
  });
});

describe('practice modes', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) =>
      routeResponse(input),
    ) as unknown as typeof fetch;
  });
  const quizCard: QueuedCard = {
    ...QUEUE[0]!,
    quiz: {
      explanation: 'This is supported by the source passage.',
      distractors: [1, 2, 3].map((n) => ({
        text: `Alternative ${n}`,
        explanation: `Alternative ${n} does not match the source.`,
      })),
    },
  };
  it('preserves written recall beside the revealed answer without auto-grading', async () => {
    const user = userEvent.setup();
    renderSession();
    await user.click(screen.getByRole('radio', { name: /^Write/ }));
    await user.type(
      screen.getByLabelText('Your answer'),
      'My remembered explanation',
    );
    expect(
      screen.queryByRole('region', { name: 'Answer' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Show answer/ }));
    expect(screen.getByLabelText('Your answer')).toHaveValue(
      'My remembered explanation',
    );
    expect(screen.getByText(/not automatically graded/)).toBeInTheDocument();
  });
  it('locks the first choice, explains an error, and only accepts Again', async () => {
    const user = userEvent.setup();
    renderSession([quizCard]);
    await user.click(screen.getByRole('radio', { name: /^Choices/ }));
    await user.keyboard(' ');
    expect(
      screen.queryByRole('region', { name: 'Answer' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Alternative 1/ }));
    expect(
      screen.getByText('Alternative 1 does not match the source.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Source' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: /Alternative 2/ }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /^Good,/ }),
    ).not.toBeInTheDocument();
    await user.keyboard('3');
    expect(global.fetch).not.toHaveBeenCalledWith(
      '/api/review/answer',
      expect.anything(),
    );
    await user.click(
      screen.getByRole('button', { name: /Again · review this sooner/ }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/0 of 1 correct on the first choice/),
      ).toBeInTheDocument(),
    );
  });
  it('suggests the regimen and offers to make choices for a card without them', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/choices')
        ? respond({ quiz: quizCard.quiz })
        : routeResponse(input),
    ) as unknown as typeof fetch;
    renderSession();
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Flashcard\s*Suggested/ }),
    ).toBeChecked();
    await user.click(
      screen.getByRole('radio', { name: /Choices\s*No choices yet/ }),
    );
    expect(screen.getByText('This card has no choices yet.')).toBeVisible();
    expect(screen.getByText(/Just for this card/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Make choices' }));
    expect(
      await screen.findByRole('button', { name: /Alternative 1/ }),
    ).toBeVisible();
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/cards/${QUEUE[0]!.id}/choices`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByText(/Choices written by AI/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Choices$/ })).toBeChecked();
  });
  it('automatically uses a saved multiple-choice preference', () => {
    renderSession([{ ...quizCard, answerType: 'choice' }]);
    expect(screen.getByRole('button', { name: /Alternative 1/ })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Show answer/ }),
    ).not.toBeInTheDocument();
  });
});

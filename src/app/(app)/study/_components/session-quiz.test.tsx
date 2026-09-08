import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SessionQuiz } from './session-quiz';

jest.mock('@/game/systems/juice/play-pitched', () => ({
  playPitched: jest.fn(),
}));

const SESSION = '3fa235f4-dbaa-4f56-83dd-36e7be76b625';
const QUIZ = {
  sessionId: SESSION,
  questions: [
    {
      cardId: 'c1',
      question: 'Q1?',
      options: ['right1', 'wrong', 'wrong2', 'wrong3'],
    },
    {
      cardId: 'c2',
      question: 'Q2?',
      options: ['wrong', 'right2', 'wrong2', 'wrong3'],
    },
  ],
  submitted: false,
};

const respond = (data: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ data }),
});

function mockRoutes(quiz = QUIZ) {
  let correctSoFar = 0;
  let answered = 0;
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.startsWith('/api/review/session-quiz?')) return respond(quiz);
      if (path === '/api/review/session-quiz/answer') {
        const body = JSON.parse(String(init?.body)) as {
          cardId: string;
          optionIndex: number;
        };
        const correct =
          body.cardId === 'c1'
            ? body.optionIndex === 0
            : body.optionIndex === 1;
        answered += 1;
        if (correct) correctSoFar += 1;
        const multiplier = correctSoFar === 2 ? 2 : 1;
        return respond({
          correct,
          correctSoFar,
          answered,
          total: 2,
          multiplier,
        });
      }
      if (path === '/api/review/session-quiz')
        return respond({
          multiplier: correctSoFar === 2 ? 2 : 1,
          insightAwarded: correctSoFar * 3,
          correct: correctSoFar,
          total: 2,
        });
      throw new Error(`Unmocked ${path}`);
    },
  ) as unknown as typeof fetch;
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe('SessionQuiz', () => {
  it('skips straight to the reward when there is nothing to ask', async () => {
    mockRoutes({ ...QUIZ, questions: [] });
    const onSkip = jest.fn();
    render(
      <SessionQuiz
        sessionId={SESSION}
        onSkip={onSkip}
        onFinished={jest.fn()}
      />,
      { wrapper },
    );
    await waitFor(() => expect(onSkip).toHaveBeenCalled());
  });

  it('offers Skip from the first frame, and skipping forfeits nothing', async () => {
    mockRoutes();
    const onSkip = jest.fn();
    render(
      <SessionQuiz
        sessionId={SESSION}
        onSkip={onSkip}
        onFinished={jest.fn()}
      />,
      { wrapper },
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Skip, keep my Focus as is' }),
    );
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('never shows the multiplier below ×1.0 and raises it as answers land', async () => {
    mockRoutes();
    const onFinished = jest.fn();
    render(
      <SessionQuiz
        sessionId={SESSION}
        onSkip={jest.fn()}
        onFinished={onFinished}
      />,
      { wrapper },
    );
    await screen.findByText('Q1?');
    expect(screen.getByLabelText('Bonus multiplier 1.0')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'wrong' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Not that one. No penalty.',
    );
    expect(screen.getByLabelText('Bonus multiplier 1.0')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await screen.findByText('Q2?');
    await userEvent.click(screen.getByRole('button', { name: 'right2' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Right.');
    await userEvent.click(screen.getByRole('button', { name: 'See my bonus' }));
    await waitFor(() =>
      expect(onFinished).toHaveBeenCalledWith(
        expect.objectContaining({ correct: 1, total: 2, multiplier: 1 }),
      ),
    );
  });
});

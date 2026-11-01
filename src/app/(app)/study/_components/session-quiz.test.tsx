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
        return respond({
          cardId: body.cardId,
          correctAnswer: body.cardId === 'c1' ? 'right1' : 'right2',
          explanation:
            'The source supports this answer because of the stated distinction.',
          sourceQuote: 'The original passage explaining the distinction.',
          correct,
          correctSoFar,
          answered,
          total: 2,
        });
      }
      if (path === '/api/review/session-quiz')
        return respond({
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
  it('skips straight to the session result when there is nothing to ask', async () => {
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
    expect(await screen.findByText(/^Optional\. Practice/)).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Skip quiz' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows corrective feedback and saves the score', async () => {
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

    await userEvent.click(screen.getByRole('button', { name: 'wrong' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Not quite');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await screen.findByText('Q2?');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'right2' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Correct!');
    await userEvent.click(screen.getByRole('button', { name: 'See results' }));
    await waitFor(() =>
      expect(onFinished).toHaveBeenCalledWith(
        expect.objectContaining({ correct: 1, total: 2 }),
      ),
    );
  });
});

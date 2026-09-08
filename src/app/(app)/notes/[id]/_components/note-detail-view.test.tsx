import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { NoteDetail } from '@/domain/types';
import { NoteDetailView } from './note-detail-view';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const SOURCE_ID = '2f1c9c7e-3d1a-4d2b-9f0a-1c2d3e4f5a6b';

const detail: NoteDetail = {
  source: {
    id: SOURCE_ID,
    userId: 'u1',
    kind: 'paste',
    title: 'Nerves',
    contentHash: 'abc',
    createdAt: new Date('2026-09-08T00:00:00Z'),
  },
  chunks: [],
  cards: [],
  status: {
    sourceId: SOURCE_ID,
    totalChunks: 2,
    processedChunks: 2,
    failedChunks: 1,
    cardsCreated: 0,
    rejectedCards: 0,
    finished: true,
    message: 'LocalCliProvider: the model did not return JSON.',
  },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('NoteDetailView', () => {
  it('offers a retry for failed sections and posts to the generate route', async () => {
    // jsdom has no Response; a plain object covers what apiFetch reads.
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.endsWith('/generate') ? { started: true } : detail;
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: body }),
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<NoteDetailView sourceId={SOURCE_ID} existing={false} />, {
      wrapper,
    });

    const retry = await screen.findByRole('button', {
      name: 'Try the failed sections again',
    });
    expect(screen.getByText(/did not return JSON/)).toBeInTheDocument();
    await userEvent.click(retry);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/notes/${SOURCE_ID}/generate`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});

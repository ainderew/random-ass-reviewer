import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CacheReveal } from './cache-reveal';

const opened = {
  rarity: 'rare',
  contents: { assetIds: ['fountain_stone'], focus: 120, insight: 0 },
  alreadyOpened: false,
};

beforeEach(() => {
  // jsdom has no matchMedia; without it the hook assumes reduced motion.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ data: opened }),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe('CacheReveal', () => {
  it('clicking during the sequence skips to the final state with the real contents', async () => {
    const onDone = jest.fn();
    render(<CacheReveal cacheId="c1" onDone={onDone} />, { wrapper });

    await userEvent.click(
      screen.getByRole('button', { name: 'Skip the chest animation' }),
    );

    expect(await screen.findByText('Stone fountain')).toBeInTheDocument();
    expect(screen.getByText(/Rare piece/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Chest opened' }),
    ).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/cache/c1/open',
      expect.anything(),
    );
  });
});

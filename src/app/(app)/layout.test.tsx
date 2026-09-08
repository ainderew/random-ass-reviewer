import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { Providers } from '@/app/providers';
import { auth } from '@/server/auth';
import { getStatsSnapshot } from '@/server/services/user-stats';
import AppLayout from './layout';

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  usePathname: () => '/study',
}));
jest.mock('@/server/auth', () => ({ auth: jest.fn(), signOut: jest.fn() }));
jest.mock('@/server/services/user-stats', () => ({
  getStatsSnapshot: jest.fn(),
}));

const snapshot = {
  stats: {
    userId: 'u1',
    focusBalance: 120,
    insightBalance: 4,
    xp: 0,
    level: 1,
    streakDays: 2,
    streakFreezes: 2,
    lastSessionDate: null,
  },
  today: { creditedMs: 0, sessionsStarted: 0 },
};

describe('AppLayout', () => {
  it('redirects a signed-out visitor to /', async () => {
    jest.mocked(auth).mockResolvedValue(null as never);

    await expect(AppLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT:/',
    );

    expect(redirect).toHaveBeenCalledWith('/');
    expect(getStatsSnapshot).not.toHaveBeenCalled();
  });

  it('renders both navs, the HUD, and the page for a signed-in user', async () => {
    jest
      .mocked(auth)
      .mockResolvedValue({ user: { id: 'u1' }, expires: '' } as never);
    jest.mocked(getStatsSnapshot).mockResolvedValue(snapshot);

    render(
      <Providers>{await AppLayout({ children: <p>page body</p> })}</Providers>,
    );

    // Top nav and tab bar both render; CSS decides which one shows.
    for (const label of ['Study', 'Notes', 'Review', 'Island']) {
      expect(screen.getAllByRole('link', { name: label })).toHaveLength(2);
    }
    expect(
      screen.getAllByRole('link', { name: 'Study', current: 'page' }),
    ).toHaveLength(2);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(
      screen.getByText('Focus', { selector: '.sr-only' }),
    ).toBeInTheDocument();
    expect(screen.getByText('page body')).toBeInTheDocument();
  });
});

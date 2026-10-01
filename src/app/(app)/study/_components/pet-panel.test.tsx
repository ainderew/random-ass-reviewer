import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { PetView } from '@/domain/types';
import { PetPanel } from './pet-panel';

jest.mock('./character-view', () => ({ CharacterView: () => null }));

const career = { focusMs: 0, highGrades: 0, cardsRecalled: 0 };

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

const base: PetView = {
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

const calls: { path: string; method: string; body: unknown }[] = [];
let pet: PetView;

beforeEach(() => {
  calls.length = 0;
  pet = { ...base };
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ path, method, body });
      let data: unknown;
      if (path === '/api/pet' && method === 'GET') data = pet;
      else if (path === '/api/pet' && method === 'PATCH')
        data = { ...pet, ...body };
      else if (path === '/api/pet/care') {
        pet = {
          ...pet,
          grams: 3_700,
          stage: 'Slim',
          happiness: 76,
          kibble: { bowls: 0, minutesToNext: 10 },
        };
        data = {
          pet,
          action: body.action,
          toy: body.toy ?? null,
          happinessRaised: true,
        };
      } else if (path === '/api/push/subscription')
        data = { publicKey: null, devices: 0 };
      else throw new Error(`Unmocked route ${method} ${path}`);
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

describe('PetPanel', () => {
  it('shows her name, weight, how she feels and her next bowl', async () => {
    render(<PetPanel career={career} />, { wrapper });
    expect(await screen.findByDisplayValue('Toast')).toBeInTheDocument();
    expect(screen.getByText('3.6 kg')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Happiness' })).toHaveAttribute(
      'aria-valuetext',
      '70 of 100, happy',
    );
    expect(
      screen.getByRole('progressbar', { name: "Toast's next bowl of kibble" }),
    ).toHaveAttribute('aria-valuenow', '60');
  });

  it('feeds her from the bowl the server says is waiting', async () => {
    render(<PetPanel career={career} />, { wrapper });
    const tray = await screen.findByRole('list', { name: 'Care for Toast' });
    await userEvent.click(within(tray).getByRole('button', { name: /Kibble/ }));
    await waitFor(() => expect(screen.getByText('3.7 kg')).toBeInTheDocument());
    expect(calls).toContainEqual({
      path: '/api/pet/care',
      method: 'POST',
      body: { action: 'feed' },
    });
  });

  it('says what opens a locked toy and does nothing when it is tapped', async () => {
    render(<PetPanel career={career} />, { wrapper });
    const tray = await screen.findByRole('list', { name: 'Care for Toast' });
    const brush = within(tray).getByRole('button', { name: /Soft brush/ });
    expect(brush).toHaveAttribute('aria-disabled', 'true');
    expect(brush).toHaveTextContent('Unlocks with 3 quizzes at 75% or better');
    await userEvent.click(brush);
    expect(calls.some((c) => c.path === '/api/pet/care')).toBe(false);
  });

  it('plays with an unlocked toy', async () => {
    render(<PetPanel career={career} />, { wrapper });
    const tray = await screen.findByRole('list', { name: 'Care for Toast' });
    await userEvent.click(
      within(tray).getByRole('button', { name: /Feather wand/ }),
    );
    await waitFor(() =>
      expect(calls).toContainEqual({
        path: '/api/pet/care',
        method: 'POST',
        body: { action: 'play', toy: 'wand' },
      }),
    );
  });

  it('renames her', async () => {
    render(<PetPanel career={career} />, { wrapper });
    const name = await screen.findByLabelText("Your cat's name");
    await userEvent.clear(name);
    await userEvent.type(name, 'Mochi{Enter}');
    await waitFor(() =>
      expect(calls).toContainEqual({
        path: '/api/pet',
        method: 'PATCH',
        body: { name: 'Mochi' },
      }),
    );
  });

  it('says she misses you after a long day apart', async () => {
    pet = { ...base, missesYou: true, happiness: 30, mood: 'lonely' };
    render(<PetPanel career={career} />, { wrapper });
    expect(await screen.findByText('Misses you')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /Toast is waiting for you\. She looks lonely\.$/,
    );
  });
});

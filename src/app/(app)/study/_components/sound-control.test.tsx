import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  playFocusMix,
  stopFocusSound,
} from '@/game/systems/focus-sound/player';
import { useFocusSoundPlayback } from '../_hooks/use-focus-sound';
import { SoundControl } from './sound-control';

jest.mock('@/game/systems/focus-sound/player');

// The Focus tab holds the playback; the control only chooses.
const Focus = ({ session }: { session: boolean }) => {
  useFocusSoundPlayback(session);
  return <SoundControl live={session} />;
};

const store = (on: string[], volume: Record<string, number> = {}) =>
  localStorage.setItem('aloft:focus-mix', JSON.stringify({ on, volume }));
const playing = () => jest.mocked(playFocusMix).mock.calls.at(-1)?.[0];

beforeEach(() => {
  localStorage.clear();
  jest.mocked(playFocusMix).mockClear();
  jest.mocked(stopFocusSound).mockClear();
});

describe('SoundControl', () => {
  it('is silent until a sound is chosen, then plays it while the sheet is open', async () => {
    render(<Focus session={false} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Focus sound: off' }),
    );
    const sheet = screen.getByRole('dialog', { name: 'Focus sound' });
    expect(screen.getByRole('button', { name: 'Silence' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('switch', { name: 'Rain' }),
    ).toHaveAccessibleDescription('Covers talk around you');
    expect(playing()).toEqual([]);

    await userEvent.click(screen.getByRole('switch', { name: 'Rain' }));
    expect(playing()).toEqual([{ id: 'rain', volume: 0.6 }]);
    expect(screen.getByRole('switch', { name: 'Rain' })).toBeChecked();
    expect(sheet).toHaveTextContent('What the research says');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(playing()).toEqual([]);
    expect(
      screen.getByRole('button', { name: 'Focus sound: Rain' }),
    ).toHaveFocus();
  });

  it('layers rain under the piano, each with its own volume', async () => {
    store(['rain']);
    render(<Focus session />);
    expect(playing()).toEqual([{ id: 'rain', volume: 0.6 }]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Focus sound: Rain' }),
    );
    // No link away from a running timer.
    expect(screen.queryByText('What the research says')).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'Soft piano' }));
    expect(playing()).toEqual([
      { id: 'rain', volume: 0.6 },
      { id: 'piano', volume: 0.6 },
    ]);

    fireEvent.change(screen.getByRole('slider', { name: 'Rain volume' }), {
      target: { value: '25' },
    });
    expect(playing()).toEqual([
      { id: 'rain', volume: 0.25 },
      { id: 'piano', volume: 0.6 },
    ]);
    expect(
      screen.queryByRole('slider', { name: 'Brown noise volume' }),
    ).toBeNull();

    await userEvent.keyboard('{Escape}');
    expect(
      screen.getByRole('button', { name: 'Focus sound: Rain and Soft piano' }),
    ).toHaveTextContent('Mix');
    // Closing the sheet mid-session keeps the mix playing.
    expect(stopFocusSound).not.toHaveBeenCalled();
  });

  it('remembers a layer volume when it is turned off and on again', async () => {
    store(['rain', 'piano'], { rain: 0.25 });
    render(<Focus session />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Focus sound: Rain and Soft piano' }),
    );
    await userEvent.click(screen.getByRole('switch', { name: 'Rain' }));
    expect(playing()).toEqual([{ id: 'piano', volume: 0.6 }]);
    await userEvent.click(screen.getByRole('switch', { name: 'Rain' }));
    expect(playing()).toEqual([
      { id: 'rain', volume: 0.25 },
      { id: 'piano', volume: 0.6 },
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Silence' }));
    expect(playing()).toEqual([]);
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('fades out when the session ends or the Focus tab is left', () => {
    store(['brown']);
    const { rerender, unmount } = render(<Focus session />);
    expect(playing()).toEqual([{ id: 'brown', volume: 0.6 }]);
    rerender(<Focus session={false} />);
    expect(playing()).toEqual([]);
    rerender(<Focus session />);
    unmount();
    expect(stopFocusSound).toHaveBeenCalled();
  });

  it('stops the preview when the sheet goes away with the page', async () => {
    store(['rain']);
    const first = render(<Focus session={false} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Focus sound: Rain' }),
    );
    expect(playing()).toEqual([{ id: 'rain', volume: 0.6 }]);
    // As if "What the research says" was followed with the sheet open.
    first.unmount();
    render(<Focus session={false} />);
    expect(playing()).toEqual([]);
  });

  it('treats a stored value it cannot read as silence', () => {
    localStorage.setItem('aloft:focus-mix', '{"on":["whale-song"]');
    render(<Focus session />);
    expect(playing()).toEqual([]);
    expect(
      screen.getByRole('button', { name: 'Focus sound: off' }),
    ).toBeInTheDocument();
  });
});

import { act, renderHook } from '@testing-library/react';
import { useWakeLock } from './use-wake-lock';

// jsdom has no Screen Wake Lock. A stand-in records what the hook asks for.
const sentinels: { released: boolean; release: jest.Mock }[] = [];
const request = jest.fn(async () => {
  const sentinel = {
    released: false,
    release: jest.fn(async () => {
      sentinel.released = true;
    }),
  };
  sentinels.push(sentinel);
  return sentinel;
});

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  sentinels.length = 0;
  request.mockClear();
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request },
  });
  setVisibility('visible');
});

afterAll(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
});

describe('useWakeLock', () => {
  it('keeps the screen on while a session runs, and lets go after', async () => {
    const { rerender } = renderHook(({ on }) => useWakeLock(on), {
      initialProps: { on: false },
    });
    expect(request).not.toHaveBeenCalled();

    rerender({ on: true });
    await act(async () => undefined);
    expect(request).toHaveBeenCalledWith('screen');

    rerender({ on: false });
    expect(sentinels[0]?.release).toHaveBeenCalled();
  });

  it('takes the lock again on coming back to the app', async () => {
    renderHook(() => useWakeLock(true));
    await act(async () => undefined);
    // The browser drops the lock when the page is hidden.
    sentinels[0]!.released = true;
    await act(async () => {
      setVisibility('hidden');
      setVisibility('visible');
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does nothing where the browser has no wake lock', () => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });
});

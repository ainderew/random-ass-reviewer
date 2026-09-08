/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { worldState } from '@/game/systems/world-state';
import { playPitched } from './play-pitched';
import { useHitStop } from './use-hit-stop';
import { useScreenShake } from './use-screen-shake';
import { useSpringPop } from './use-spring-pop';

// The requirement most likely to regress. Every primitive, checked directly.
describe('juice primitives under reduced motion', () => {
  beforeEach(() => {
    worldState.reducedMotion = true;
    worldState.frozen = false;
  });
  afterEach(() => {
    worldState.reducedMotion = false;
  });

  it('useHitStop does not freeze', () => {
    const { result } = renderHook(() => useHitStop());
    act(() => result.current.freeze(100));
    expect(result.current.frozen).toBe(false);
    expect(worldState.frozen).toBe(false);
  });

  it('useScreenShake leaves the element still', () => {
    const { result } = renderHook(() => useScreenShake());
    const el = document.createElement('div');
    result.current.ref.current = el;
    act(() => result.current.shake(12));
    expect(el.style.transform).toBe('');
  });

  it('useSpringPop crossfades instead of popping', () => {
    const { result } = renderHook(() => useSpringPop());
    expect(result.current.className).toBe('fade-in');
  });

  it('playPitched stays silent without the audio switch', () => {
    const AudioContextMock = jest.fn();
    Object.defineProperty(window, 'AudioContext', {
      value: AudioContextMock,
      configurable: true,
    });
    playPitched({ frequency: 440 });
    expect(AudioContextMock).not.toHaveBeenCalled();
  });
});

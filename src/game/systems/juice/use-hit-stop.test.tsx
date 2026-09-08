import { act, renderHook } from '@testing-library/react';
import { worldState } from '@/game/systems/world-state';
import { useHitStop } from './use-hit-stop';

describe('useHitStop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    worldState.reducedMotion = false;
    worldState.frozen = false;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('freezes the world for the requested beat, then releases', () => {
    const { result } = renderHook(() => useHitStop());
    act(() => result.current.freeze(100));
    expect(worldState.frozen).toBe(true);
    expect(result.current.frozen).toBe(true);
    act(() => {
      jest.advanceTimersByTime(120);
    });
    expect(worldState.frozen).toBe(false);
    expect(result.current.frozen).toBe(false);
  });

  it('is a no-op under reduced motion', () => {
    worldState.reducedMotion = true;
    const { result } = renderHook(() => useHitStop());
    act(() => result.current.freeze(100));
    expect(worldState.frozen).toBe(false);
    expect(result.current.frozen).toBe(false);
  });
});

import { worldState } from '@/game/systems/world-state';
import { shakeOffset } from './use-screen-shake';

describe('juice under reduced motion', () => {
  afterEach(() => {
    worldState.reducedMotion = false;
    worldState.frozen = false;
  });

  it('shake decays exponentially toward zero', () => {
    const early = Math.abs(shakeOffset(10, 0.02));
    const late = Math.abs(shakeOffset(10, 0.3));
    expect(early).toBeGreaterThan(late);
    expect(late).toBeLessThan(1);
  });
});

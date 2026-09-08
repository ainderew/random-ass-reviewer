'use client';

import { worldState } from '@/game/systems/world-state';

// Class names for anything that appears. One curve for chest, banner, badge,
// and (as revealScale) the island props, so motion reads as one family.
export function useSpringPop(): { className: string; style?: undefined } {
  return { className: worldState.reducedMotion ? 'fade-in' : 'spring-pop' };
}

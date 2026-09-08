'use client';

import { DevStatsOverlay } from './stats';
import { DevTimeScrubber } from './time-scrubber';

// Everything development-only that sits over the canvas, in one import so the
// production branch has exactly one thing to eliminate.
export const DevPanel = () => (
  <>
    <DevStatsOverlay />
    <DevTimeScrubber />
  </>
);

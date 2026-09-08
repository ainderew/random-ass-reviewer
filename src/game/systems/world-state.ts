import { skyPaletteFor, type SkyPalette } from '@/domain/world/sun';

// Read every frame by several systems. A plain object on purpose: even a
// transient store read is needless overhead at this frequency.
export const worldState = {
  elapsed: 0,
  windPhase: 0,
  // Radians. Negative below the horizon.
  sunAltitude: 1,
  sunAzimuth: 0,
  // 0 full night, 1 full day.
  dayFactor: 1,
  localHour: 12,
  reducedMotion: false,
  // Hit-stop. The clock holds still while this is true.
  frozen: false,
  // Dev-only scrubber. null means the real clock.
  hourOverride: null as number | null,
  palette: skyPaletteFor(1, 12) as SkyPalette,
};

// One vocabulary for every reward, 2D or 3D. Tune here, nowhere else.
export const HIT_STOP_MS = 100;

export const SHAKE = {
  // Amplitude in px (2D) or world units (3D), by rarity. Common gets none.
  common: 0,
  uncommon: 2,
  rare: 5,
  epic: 9,
  decay: 9,
  frequency: 42,
  durationMs: 320,
} as const;

// Overshoot spring shared with the island placement reveal.
export const SPRING = { durationMs: 520, overshoot: 1.12 } as const;

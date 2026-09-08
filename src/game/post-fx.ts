import type { Rarity } from '@/domain/types';

// Per-frame post-processing intensities. Spiked on rare drops, decayed by the
// composer. Plain object: read on the frame loop, never through React.
export const postFx = { bloom: 0, aberration: 0 };

const SPIKE: Record<Rarity, { bloom: number; aberration: number }> = {
  common: { bloom: 0, aberration: 0 },
  uncommon: { bloom: 0.4, aberration: 0 },
  rare: { bloom: 1.4, aberration: 0.0025 },
  epic: { bloom: 2.6, aberration: 0.005 },
};

export function spikeReward(rarity: Rarity): void {
  postFx.bloom = Math.max(postFx.bloom, SPIKE[rarity].bloom);
  postFx.aberration = Math.max(postFx.aberration, SPIKE[rarity].aberration);
}

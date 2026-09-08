import type { Rarity } from '@/domain/types';

const RAYS: Record<Rarity, number> = {
  common: 6,
  uncommon: 8,
  rare: 12,
  epic: 18,
};
const REACH: Record<Rarity, number> = {
  common: 48,
  uncommon: 64,
  rare: 88,
  epic: 120,
};

// Rays scale with rarity. If common already fills the screen, epic has nowhere to go.
export const RarityBurst = ({
  rarity,
  color,
}: {
  rarity: Rarity;
  color: string;
}) => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 flex items-center justify-center"
  >
    {Array.from({ length: RAYS[rarity] }, (_, i) => (
      <span
        key={i}
        className="burst-ray absolute h-6 w-0.5 origin-bottom rounded-full"
        style={{
          background: color,
          ['--angle' as string]: `${(360 / RAYS[rarity]) * i}deg`,
          ['--reach' as string]: `${REACH[rarity]}px`,
          animationDelay: `${(i % 3) * 30}ms`,
        }}
      />
    ))}
  </div>
);

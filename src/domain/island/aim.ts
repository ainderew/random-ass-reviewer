import {
  ASSET_IDS,
  ASSET_MANIFEST,
  type AssetId,
} from '@/domain/assets/manifest.generated';
import { FOCUS_PER_MINUTE } from '@/domain/economy/constants';
import { isStarterAsset } from '@/domain/economy/unlocks';

export interface Aim {
  assetId: AssetId;
  label: string;
  priceFocus: number;
}

// Whole focused minutes until the piece is affordable. Zero means it is.
export function minutesToAfford(
  priceFocus: number,
  focusBalance: number,
): number {
  return Math.ceil(Math.max(0, priceFocus - focusBalance) / FOCUS_PER_MINUTE);
}

// Starter pieces open at this level, cheapest first. Won pieces are not aims:
// they cannot be studied toward.
export function aimCandidates(level: number): Aim[] {
  return ASSET_IDS.filter((id) => {
    const asset = ASSET_MANIFEST[id];
    return (
      isStarterAsset(id) && asset.priceFocus > 0 && asset.minLevel <= level
    );
  })
    .map((id) => ({
      assetId: id,
      label: ASSET_MANIFEST[id].label,
      priceFocus: ASSET_MANIFEST[id].priceFocus,
    }))
    .sort((a, b) => a.priceFocus - b.priceFocus);
}

// The cheapest piece still out of reach, so the aim is always a little ahead.
// With everything affordable, the dearest one, so there is still a name on it.
export function defaultAim(level: number, focusBalance: number): Aim | null {
  const candidates = aimCandidates(level);
  return (
    candidates.find((c) => c.priceFocus > focusBalance) ??
    candidates[candidates.length - 1] ??
    null
  );
}

export function aimById(assetId: string, level: number): Aim | null {
  return aimCandidates(level).find((c) => c.assetId === assetId) ?? null;
}

'use client';

import {
  ASSET_IDS,
  ASSET_MANIFEST,
  type AssetId,
} from '@/domain/assets/manifest.generated';
import { PLACEABLE_CATEGORIES } from '@/domain/assets/types';
import { assetAvailability } from '@/domain/economy/unlocks';
import { canAfford, refundForRemoval } from '@/domain/island/pricing';
import { Button } from '@/components/ui/button';
import { CurrencyBadge } from '@/components/ui/currency-badge';
import { useIslandStore } from '@/game/store/island-store';

export interface PaletteBalances {
  focus: number;
  insight: number;
}

const placeable = ASSET_IDS.filter((id) =>
  PLACEABLE_CATEGORIES.includes(ASSET_MANIFEST[id].category),
);

// Plain HTML over the canvas. A bottom sheet on phones, a side panel from
// tablet up. Locked and unaffordable items stay visible with the reason;
// the server checks all of it again on placement regardless.
export const BuildPalette = ({
  balances,
  level,
  ownedAssetIds,
  freeCredits,
  onPlaceArmed,
  onRemoveSelected,
  busy,
}: {
  balances: PaletteBalances;
  level: number;
  ownedAssetIds: ReadonlyArray<string>;
  freeCredits: Record<string, number>;
  onPlaceArmed: () => void;
  onRemoveSelected: () => void;
  busy: boolean;
}) => {
  const mode = useIslandStore((s) => s.mode);
  const selectedAssetId = useIslandStore((s) => s.selectedAssetId);
  const selectedPlacementId = useIslandStore((s) => s.selectedPlacementId);
  const armedTile = useIslandStore((s) => s.armedTile);
  const placements = useIslandStore((s) => s.placements);
  const { setMode, selectAsset, rotateGhost } = useIslandStore.getState();

  if (mode !== 'build') return null;

  const owned = new Set(ownedAssetIds);
  const selectedPlacement =
    placements.find((p) => p.id === selectedPlacementId) ?? null;
  const selectedPlacementAsset =
    selectedPlacement &&
    (ASSET_MANIFEST as Record<string, (typeof ASSET_MANIFEST)[AssetId]>)[
      selectedPlacement.assetId
    ];

  return (
    <aside
      aria-label="Build palette"
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-(--z-sticky) max-h-[45dvh] overflow-y-auto border-t border-hairline bg-ground-2/95 p-4 backdrop-blur-sm md:absolute md:top-4 md:right-4 md:bottom-auto md:inset-x-auto md:max-h-[calc(100%-2rem)] md:w-72 md:rounded-lg md:border"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-ink">Build</h2>
        <Button variant="ghost" onClick={() => setMode('view')}>
          Done
        </Button>
      </div>

      {selectedPlacement && selectedPlacementAsset ? (
        <div className="mb-3 space-y-2 rounded-md border border-hairline p-3">
          <p className="text-sm text-ink">{selectedPlacementAsset.label}</p>
          <Button
            variant="ghost"
            onClick={onRemoveSelected}
            disabled={busy}
            block
          >
            Remove, get {refundForRemoval(selectedPlacementAsset).focus} Focus
            back
          </Button>
        </div>
      ) : null}

      <ul className="grid grid-cols-2 gap-2 md:grid-cols-1">
        {placeable.map((id) => {
          const asset = ASSET_MANIFEST[id];
          const availability = assetAvailability({
            assetId: id,
            level,
            ownedAssetIds: owned,
          });
          const free = (freeCredits[id] ?? 0) > 0;
          const affordable = free || canAfford(balances, asset);
          const enabled = availability === 'available' && affordable;
          const selected = selectedAssetId === id;
          const hint =
            availability === 'locked-won'
              ? 'Won from a chest'
              : availability === 'locked-level'
                ? `Level ${asset.minLevel}`
                : free
                  ? `Free ×${freeCredits[id]}`
                  : null;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={!enabled}
                aria-pressed={selected}
                onClick={() => selectAsset(selected ? null : id)}
                className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-45 ${
                  selected
                    ? 'border-focus bg-ground-3 text-ink'
                    : 'border-hairline text-ink-2 hover:border-ink-2 hover:text-ink'
                }`}
              >
                <span className="flex flex-col">
                  <span>{asset.label}</span>
                  {hint ? (
                    <span className="text-xs text-muted">{hint}</span>
                  ) : null}
                </span>
                {free ? (
                  <span className="text-xs text-focus">Free</span>
                ) : (
                  <CurrencyBadge
                    kind="focus"
                    amount={asset.priceFocus}
                    compact
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {selectedAssetId ? (
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={rotateGhost} className="flex-1">
            Rotate
          </Button>
          {armedTile ? (
            <Button onClick={onPlaceArmed} disabled={busy} className="flex-1">
              Place here
            </Button>
          ) : null}
        </div>
      ) : null}
      {selectedAssetId ? (
        <p className="mt-2 text-xs text-muted">
          Tap a tile, then Place. On a keyboard, R rotates.
        </p>
      ) : null}
    </aside>
  );
};

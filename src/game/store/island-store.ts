import { create } from 'zustand';
import {
  ASSET_MANIFEST,
  isAssetId,
  type AssetId,
} from '@/domain/assets/manifest.generated';
import { occupiedTileKeys } from '@/domain/island/grid';
import type { GridCoord, Placement } from '@/domain/types';

export type IslandMode = 'view' | 'build';

// Ephemeral scene state. Balances live in TanStack Query, per-frame values
// live in refs. hoveredTile changes at pointer-move rate, so anything on the
// frame loop reads it through getState(), never through a selector.
export interface IslandState {
  mode: IslandMode;
  selectedAssetId: AssetId | null;
  selectedPlacementId: string | null;
  hoveredTile: GridCoord | null;
  // Touch has no hover: a first tap arms a tile, a button confirms it.
  armedTile: GridCoord | null;
  ghostRotation: number;
  placements: Placement[];
  pending: Placement[];
  occupied: Set<string>;
  setMode: (mode: IslandMode) => void;
  selectAsset: (id: AssetId | null) => void;
  selectPlacement: (id: string | null) => void;
  setHoveredTile: (tile: GridCoord | null) => void;
  setArmedTile: (tile: GridCoord | null) => void;
  rotateGhost: () => void;
  setPlacements: (placements: Placement[]) => void;
  addPending: (placement: Placement) => void;
  removePending: (id: string) => void;
}

function computeOccupied(
  placements: Placement[],
  pending: Placement[],
): Set<string> {
  return occupiedTileKeys(
    [...placements, ...pending].map((p) => ({
      x: p.x,
      z: p.z,
      rotY: p.rotY,
      footprint: isAssetId(p.assetId)
        ? ASSET_MANIFEST[p.assetId].footprint
        : [1, 1],
    })),
  );
}

export const initialIslandState = {
  mode: 'view' as IslandMode,
  selectedAssetId: null,
  selectedPlacementId: null,
  hoveredTile: null,
  armedTile: null,
  ghostRotation: 0,
  placements: [] as Placement[],
  pending: [] as Placement[],
  occupied: new Set<string>(),
};

export const useIslandStore = create<IslandState>((set) => ({
  ...initialIslandState,
  setMode: (mode) =>
    set(
      mode === 'view'
        ? {
            mode,
            selectedAssetId: null,
            selectedPlacementId: null,
            hoveredTile: null,
            armedTile: null,
          }
        : { mode },
    ),
  selectAsset: (selectedAssetId) =>
    set({ selectedAssetId, selectedPlacementId: null, armedTile: null }),
  selectPlacement: (selectedPlacementId) =>
    set({ selectedPlacementId, selectedAssetId: null }),
  setHoveredTile: (hoveredTile) => set({ hoveredTile }),
  setArmedTile: (armedTile) => set({ armedTile }),
  rotateGhost: () => set((s) => ({ ghostRotation: (s.ghostRotation + 1) % 4 })),
  setPlacements: (placements) =>
    set((s) => ({
      placements,
      occupied: computeOccupied(placements, s.pending),
    })),
  addPending: (placement) =>
    set((s) => {
      const pending = [...s.pending, placement];
      return { pending, occupied: computeOccupied(s.placements, pending) };
    }),
  removePending: (id) =>
    set((s) => {
      const pending = s.pending.filter((p) => p.id !== id);
      return { pending, occupied: computeOccupied(s.placements, pending) };
    }),
}));

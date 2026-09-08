'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useStats } from '@/app/(app)/_hooks/use-stats';
import {
  ASSET_MANIFEST,
  type AssetId,
} from '@/domain/assets/manifest.generated';
import { checkPlacement } from '@/domain/island/grid';
import { canAfford, describePrice } from '@/domain/island/pricing';
import type { GridCoord } from '@/domain/types';
import { AudioToggle } from '@/components/island/audio-toggle';
import { BuildPalette } from '@/components/island/build-palette';
import { EmptyIslandHint } from '@/components/island/empty-island-hint';
import { IslandFallback } from '@/components/island/island-fallback';
import { IslandSkeleton } from '@/components/island/island-skeleton';
import { IslandToolbar } from '@/components/island/island-toolbar';
import { useIslandStore } from '@/game/store/island-store';
import { apiFetch } from '@/lib/api-client';
import { useIslandListPreference } from '@/lib/use-island-list-preference';
import { hasWebGL } from '@/lib/webgl';
import { useIsland } from '../_hooks/use-island';
import { usePlaceAsset } from '../_hooks/use-place-asset';
import { useRemovePlacement } from '../_hooks/use-remove-placement';

// three.js never enters the shared bundle: the canvas arrives only here, only
// on the client, only after the page has rendered.
const IslandCanvas = dynamic(
  () => import('@/game/island-canvas').then((m) => m.IslandCanvas),
  {
    ssr: false,
    loading: () => <IslandSkeleton />,
  },
);

// Statically eliminated in production: the check is a literal, so the
// bundler drops the import along with the branch.
const DevPanel =
  process.env.NODE_ENV !== 'production'
    ? dynamic(() => import('@/game/dev/panel').then((m) => m.DevPanel), {
        ssr: false,
      })
    : null;

const noop = () => () => {};
const useWebGL = () => useSyncExternalStore(noop, hasWebGL, () => null);

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

export const IslandView = () => {
  const { data } = useIsland();
  const { data: statsData } = useStats();
  const webgl = useWebGL();
  const [listView] = useIslandListPreference();
  const setPlacements = useIslandStore((s) => s.setPlacements);
  const selectPlacement = useIslandStore((s) => s.selectPlacement);
  const [toast, setToast] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const synced = useRef(false);

  useEffect(() => {
    if (data) setPlacements(data.placements);
  }, [data, setPlacements]);

  // The world clock runs on the browser's real zone. The server learns it
  // once, for day boundaries on caps and streaks.
  useEffect(() => {
    if (!data || synced.current) return;
    synced.current = true;
    const local = browserTimeZone() ?? data.timeZone;
    setTimeZone(local);
    if (local !== data.timeZone) {
      apiFetch('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ timeZone: local }),
      }).catch(() => {
        // Nothing to do. The default stays UTC on the server.
      });
    }
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const place = usePlaceAsset(setToast);
  const remove = useRemovePlacement(setToast);

  const handlePlace = useCallback(
    (tile: GridCoord, rotY: number, assetId: AssetId) => {
      if (!data || !statsData) return;
      const asset = ASSET_MANIFEST[assetId];
      const { occupied } = useIslandStore.getState();
      const verdict = checkPlacement({
        origin: tile,
        footprint: asset.footprint,
        rotY,
        tileCount: data.island.tileCount,
        occupied,
      });
      if (!verdict.ok) {
        setToast(
          verdict.reason === 'OCCUPIED'
            ? 'That tile is taken.'
            : 'That is off the island.',
        );
        return;
      }
      const balances = {
        focus: statsData.stats.focusBalance,
        insight: statsData.stats.insightBalance,
      };
      const free = (data.freeCredits[assetId] ?? 0) > 0;
      if (!free && !canAfford(balances, asset)) {
        setToast(`Needs ${describePrice(asset)}.`);
        return;
      }
      useIslandStore.getState().setArmedTile(null);
      place.mutate({ assetId, x: tile.x, z: tile.z, rotY });
    },
    [data, statsData, place],
  );

  const handlePlaceArmed = () => {
    const { armedTile, ghostRotation, selectedAssetId } =
      useIslandStore.getState();
    if (armedTile && selectedAssetId)
      handlePlace(armedTile, ghostRotation, selectedAssetId);
  };

  const handleRemoveSelected = () => {
    const { selectedPlacementId } = useIslandStore.getState();
    if (!selectedPlacementId) return;
    selectPlacement(null);
    remove.mutate(selectedPlacementId);
  };

  if (!data || !statsData || webgl === null || timeZone === null) {
    return (
      <div className="relative min-h-[60dvh] flex-1">
        <IslandSkeleton />
      </div>
    );
  }
  if (!webgl || listView)
    return <IslandFallback placements={data.placements} />;

  const balances = {
    focus: statsData.stats.focusBalance,
    insight: statsData.stats.insightBalance,
  };

  return (
    <div className="relative -mx-4 flex-1 overflow-hidden md:mx-0 md:min-h-[60dvh] md:rounded-xl md:border md:border-hairline">
      <IslandCanvas
        island={data.island}
        timeZone={timeZone}
        signals={data.signals}
        balances={balances}
        onPlace={handlePlace}
        onSelectPlacement={selectPlacement}
      />
      <IslandToolbar focusBalance={balances.focus} />
      {data.placements.length === 0 ? <EmptyIslandHint /> : null}
      <AudioToggle />
      <BuildPalette
        balances={balances}
        level={statsData.stats.level}
        ownedAssetIds={data.ownedAssetIds}
        freeCredits={data.freeCredits}
        onPlaceArmed={handlePlaceArmed}
        onRemoveSelected={handleRemoveSelected}
        busy={place.isPending || remove.isPending}
      />
      {toast ? (
        <p
          role="status"
          className="absolute top-4 left-1/2 z-(--z-toast) -translate-x-1/2 rounded-md bg-ground-3 px-3 py-2 text-sm text-ink"
        >
          {toast}
        </p>
      ) : null}
      {DevPanel ? <DevPanel /> : null}
    </div>
  );
};

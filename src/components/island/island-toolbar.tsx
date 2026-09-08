'use client';

import { ASSET_IDS, ASSET_MANIFEST } from '@/domain/assets/manifest.generated';
import { PLACEABLE_CATEGORIES } from '@/domain/assets/types';
import { Button } from '@/components/ui/button';
import { useIslandStore } from '@/game/store/island-store';

const cheapest = Math.min(
  ...ASSET_IDS.filter((id) =>
    PLACEABLE_CATEGORIES.includes(ASSET_MANIFEST[id].category),
  ).map((id) => ASSET_MANIFEST[id].priceFocus),
);

// Top-left controls plus the first-run prompt. An empty palette with every
// item greyed out reads as broken, so a broke user gets a sentence instead.
export const IslandToolbar = ({ focusBalance }: { focusBalance: number }) => {
  const mode = useIslandStore((s) => s.mode);
  const placementCount = useIslandStore((s) => s.placements.length);
  const setMode = useIslandStore((s) => s.setMode);
  const canBuild = focusBalance >= cheapest;

  if (mode === 'build') return null;

  return (
    <div className="absolute top-4 left-4 z-(--z-sticky) max-w-xs space-y-3">
      {placementCount === 0 ? (
        <p className="rounded-md bg-ground/85 px-3 py-2 text-sm leading-relaxed text-ink-2 backdrop-blur-sm">
          {canBuild
            ? 'Bare so far. Place your first piece.'
            : `Study to earn Focus, then build. The first piece costs ${cheapest}.`}
        </p>
      ) : null}
      <Button onClick={() => setMode('build')} disabled={!canBuild}>
        Build
      </Button>
    </div>
  );
};

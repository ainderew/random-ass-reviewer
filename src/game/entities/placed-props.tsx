import { Suspense, useMemo } from 'react';
import { isAssetId, type AssetId } from '@/domain/assets/manifest.generated';
import type { Placement } from '@/domain/types';
import { AssetErrorBoundary } from '@/game/scene/asset-error-boundary';
import { useIslandStore } from '@/game/store/island-store';
import { InstancedGroup } from './instanced-group';

function groupByAsset(placements: Placement[]): Map<AssetId, Placement[]> {
  const groups = new Map<AssetId, Placement[]>();
  for (const placement of placements) {
    if (!isAssetId(placement.assetId)) continue;
    const list = groups.get(placement.assetId) ?? [];
    list.push(placement);
    groups.set(placement.assetId, list);
  }
  return groups;
}

// Confirmed and optimistic placements render the same way; the optimistic
// ones are removed by the mutation on success or failure.
export const PlacedProps = ({
  onSelect,
}: {
  onSelect?: (placementId: string) => void;
}) => {
  const placements = useIslandStore((s) => s.placements);
  const pending = useIslandStore((s) => s.pending);
  const mode = useIslandStore((s) => s.mode);
  const groups = useMemo(
    () => groupByAsset([...placements, ...pending]),
    [placements, pending],
  );

  return (
    <>
      {[...groups.entries()].map(([assetId, list]) => (
        <AssetErrorBoundary key={assetId} assetId={assetId}>
          <Suspense fallback={null}>
            <InstancedGroup
              assetId={assetId}
              placements={list}
              onSelect={mode === 'build' ? onSelect : undefined}
            />
          </Suspense>
        </AssetErrorBoundary>
      ))}
    </>
  );
};

import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Color, Group, MeshStandardMaterial } from 'three';
import {
  ASSET_MANIFEST,
  type AssetId,
} from '@/domain/assets/manifest.generated';
import {
  checkPlacement,
  footprintCenterWorld,
  rotationToRadians,
} from '@/domain/island/grid';
import { canAfford } from '@/domain/island/pricing';
import { useAsset } from '@/game/assets/use-asset';
import { useIslandStore } from '@/game/store/island-store';

const VALID = new Color('#7d9b76');
const INVALID = new Color('#e8836b');

export interface Balances {
  focus: number;
  insight: number;
}

const GhostMesh = ({
  assetId,
  tileCount,
  balances,
}: {
  assetId: AssetId;
  tileCount: number;
  balances: Balances;
}) => {
  const parts = useAsset(assetId);
  const group = useRef<Group>(null);
  const materials = useMemo(
    () =>
      parts.map(
        () =>
          new MeshStandardMaterial({
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
          }),
      ),
    [parts],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const asset = ASSET_MANIFEST[assetId];
  const affordable = canAfford(balances, asset);

  // Hovered tile changes at pointer-move rate. Read it here, not through a
  // selector, so React never re-renders for a cursor.
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const { hoveredTile, ghostRotation, occupied } = useIslandStore.getState();
    if (!hoveredTile) {
      g.visible = false;
      return;
    }
    const verdict = checkPlacement({
      origin: hoveredTile,
      footprint: asset.footprint,
      rotY: ghostRotation,
      tileCount,
      occupied,
    });
    const centre = footprintCenterWorld(
      hoveredTile,
      asset.footprint,
      ghostRotation,
    );
    g.position.set(centre.x, 0.02, centre.z);
    g.rotation.y = rotationToRadians(ghostRotation);
    g.visible = true;
    const tint = verdict.ok && affordable ? VALID : INVALID;
    for (const material of materials) material.color.copy(tint);
  });

  return (
    <group ref={group} visible={false}>
      {parts.map((part, index) => (
        <mesh
          key={index}
          geometry={part.geometry}
          material={materials[index]}
        />
      ))}
    </group>
  );
};

export const GhostPreview = ({
  tileCount,
  balances,
}: {
  tileCount: number;
  balances: Balances;
}) => {
  const selected = useIslandStore((s) => s.selectedAssetId);
  if (!selected) return null;
  return (
    <Suspense fallback={null}>
      <GhostMesh assetId={selected} tileCount={tileCount} balances={balances} />
    </Suspense>
  );
};

import type { ThreeEvent } from '@react-three/fiber';
import { useEffect } from 'react';
import type { AssetId } from '@/domain/assets/manifest.generated';
import { worldToGrid } from '@/domain/island/grid';
import type { GridCoord } from '@/domain/types';
import { useIslandStore } from '@/game/store/island-store';

export type PlaceHandler = (
  tile: GridCoord,
  rotY: number,
  assetId: AssetId,
) => void;

// An invisible plane at y = 0 catches pointer events; the hit point snaps to
// the grid. No physics, one ray-plane test.
export const BuildController = ({ onPlace }: { onPlace: PlaceHandler }) => {
  const mode = useIslandStore((s) => s.mode);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'r' || event.metaKey || event.ctrlKey)
        return;
      if (useIslandStore.getState().mode === 'build')
        useIslandStore.getState().rotateGhost();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (mode !== 'build') return null;

  const tileAt = (event: ThreeEvent<PointerEvent | MouseEvent>) =>
    worldToGrid({ x: event.point.x, z: event.point.z });

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    if (event.pointerType === 'touch') return;
    useIslandStore.getState().setHoveredTile(tileAt(event));
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    const state = useIslandStore.getState();
    if (!state.selectedAssetId) {
      state.selectPlacement(null);
      return;
    }
    const tile = tileAt(event);
    const native = event.nativeEvent as PointerEvent;
    // Touch has no hover: first tap arms the tile and shows the ghost, the
    // palette's Place button confirms it.
    if (native.pointerType === 'touch') {
      state.setHoveredTile(tile);
      state.setArmedTile(tile);
      return;
    }
    onPlace(tile, state.ghostRotation, state.selectedAssetId);
  };

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position-y={0}
      onPointerMove={handleMove}
      onPointerLeave={() => useIslandStore.getState().setHoveredTile(null)}
      onClick={handleClick}
    >
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

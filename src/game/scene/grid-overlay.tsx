import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { TILE_SIZE } from '@/domain/island/constants';
import { gridRange } from '@/domain/island/grid';
import { useIslandStore } from '@/game/store/island-store';

// One LineSegments for the whole grid: one draw call, build mode only.
export const GridOverlay = ({ tileCount }: { tileCount: number }) => {
  const mode = useIslandStore((s) => s.mode);
  const geometry = useMemo(() => {
    const { min, max } = gridRange(tileCount);
    const lo = (min - 0.5) * TILE_SIZE;
    const hi = (max + 0.5) * TILE_SIZE;
    const points: number[] = [];
    for (let i = min; i <= max + 1; i += 1) {
      const p = (i - 0.5) * TILE_SIZE;
      points.push(lo, 0, p, hi, 0, p);
      points.push(p, 0, lo, p, 0, hi);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(points, 3));
    return g;
  }, [tileCount]);

  if (mode !== 'build') return null;
  return (
    <lineSegments geometry={geometry} position={[0, 0.03, 0]}>
      <lineBasicMaterial
        color="#e9e5da"
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </lineSegments>
  );
};

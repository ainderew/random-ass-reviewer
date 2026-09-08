import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { gridToWorld } from '@/domain/island/grid';
import type { Placement } from '@/domain/types';
import { unitHash } from '@/domain/world/hash';
import { positionAlongPath, waypointsForIsland } from '@/domain/world/wander';
import { useAsset } from '@/game/assets/use-asset';
import { useIslandStore } from '@/game/store/island-store';
import { scholarCountFor } from '@/game/systems/motion-policy';
import { worldState } from '@/game/systems/world-state';

const UP = new Vector3(0, 1, 0);
const ONE = new Vector3(1, 1, 1);
const LOOP_SECONDS = 48;
const matrix = new Matrix4();
const quaternion = new Quaternion();
const position = new Vector3();

const ScholarInstances = ({
  placements,
  count,
}: {
  placements: Placement[];
  count: number;
}) => {
  const parts = useAsset('scholar_robed');
  const meshes = useRef<(InstancedMesh | null)[]>([]);

  // They walk beside the things the user built, never through them.
  const path = useMemo(
    () =>
      waypointsForIsland(placements, Math.min(6, placements.length)).map(
        (tile) => {
          const w = gridToWorld(tile);
          return { x: w.x + 1.1, z: w.z + 0.4 };
        },
      ),
    [placements],
  );

  const agents = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        phase: unitHash(`scholar-phase-${i}`),
        speed: 0.8 + 0.4 * unitHash(`scholar-speed-${i}`),
        lateral: (unitHash(`scholar-lateral-${i}`) - 0.5) * 1.2,
      })),
    [count],
  );

  // The one deliberate exception to "no matrices on the frame loop": at most
  // eight writes per frame, and the whole point is that they move.
  useFrame(() => {
    const { elapsed, reducedMotion } = worldState;
    agents.forEach((agent, i) => {
      const t = reducedMotion
        ? agent.phase
        : (elapsed * agent.speed) / LOOP_SECONDS + agent.phase;
      const sample = positionAlongPath({ path, t, dwellFraction: 0.3 });
      const bob =
        sample.isDwelling || reducedMotion
          ? 0
          : Math.sin(elapsed * 8 * agent.speed + i) * 0.04;
      position.set(
        sample.x + agent.lateral,
        bob,
        sample.z + agent.lateral * 0.5,
      );
      quaternion.setFromAxisAngle(UP, sample.heading);
      matrix.compose(position, quaternion, ONE);
      for (const mesh of meshes.current) mesh?.setMatrixAt(i, matrix);
    });
    for (const mesh of meshes.current) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {parts.map((part, index) => (
        <instancedMesh
          key={`${index}-${count}`}
          ref={(el) => {
            meshes.current[index] = el;
          }}
          args={[part.geometry, part.material, count]}
          castShadow
          frustumCulled={false}
        />
      ))}
    </>
  );
};

// Population scales with progress. A busier island is a reward in itself.
export const Scholars = ({ max = 8 }: { max?: number }) => {
  const placements = useIslandStore((s) => s.placements);
  const count = scholarCountFor(placements.length, max);
  if (count === 0) return null;
  return (
    <Suspense fallback={null}>
      <ScholarInstances placements={placements} count={count} />
    </Suspense>
  );
};

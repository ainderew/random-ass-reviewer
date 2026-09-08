import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  InstancedMesh,
  Matrix4,
  type MeshDepthMaterial,
  type MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import {
  ASSET_MANIFEST,
  type AssetId,
} from '@/domain/assets/manifest.generated';
import type { AssetRecord } from '@/domain/assets/types';
import { footprintCenterWorld, rotationToRadians } from '@/domain/island/grid';
import type { Placement } from '@/domain/types';
import { useAsset } from '@/game/assets/use-asset';
import { spikeReward } from '@/game/post-fx';
import { applyWind, windDepthMaterial } from '@/game/materials/wind-material';
import {
  isEmissiveMaterial,
  registerEmissive,
} from '@/game/systems/emissive-registry';
import { worldState } from '@/game/systems/world-state';

const UP = new Vector3(0, 1, 0);
const ONE = new Vector3(1, 1, 1);
const REVEAL_MS = 8000;
const scratch = new Matrix4();
const scaleVec = new Vector3();

// Overshoot spring for a placement younger than REVEAL_MS. Settles within ~1.5s.
function revealScale(ageMs: number): number {
  const t = ageMs / 1000;
  if (t >= 1.6) return 1;
  return Math.max(0.001, 1 - Math.exp(-5 * t) * Math.cos(7 * t));
}

interface InstanceBase {
  matrix: Matrix4;
  placedAt: number;
}

// Scales brand-new instances by the spring. Returns whether any are still young.
function applyReveal(
  meshes: ReadonlyArray<InstancedMesh | null>,
  bases: ReadonlyArray<InstanceBase>,
  now: number,
): boolean {
  let anyYoung = false;
  for (const mesh of meshes) {
    if (!mesh) continue;
    bases.forEach((base, i) => {
      const age = now - base.placedAt;
      if (age < 0 || age >= REVEAL_MS) return;
      anyYoung = true;
      const s = worldState.reducedMotion ? 1 : revealScale(age);
      scratch.copy(base.matrix).scale(scaleVec.set(s, s, s));
      mesh.setMatrixAt(i, scratch);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  return anyYoung;
}

// One InstancedMesh per glTF primitive of one asset type. Fifty lanterns cost
// one draw call per part. Matrices are written once per placements change;
// the only per-frame writes are the reveal spring on brand-new pieces.
export const InstancedGroup = ({
  assetId,
  placements,
  onSelect,
}: {
  assetId: AssetId;
  placements: Placement[];
  onSelect?: (placementId: string) => void;
}) => {
  const parts = useAsset(assetId);
  const meshes = useRef<(InstancedMesh | null)[]>([]);
  // Widened so optional fields like wind type-check across the union.
  const asset: AssetRecord = ASSET_MANIFEST[assetId];

  const depthMaterials = useMemo(() => {
    if (!asset.wind) return [];
    return parts.map((part) => {
      part.geometry.computeBoundingBox();
      const height = part.geometry.boundingBox?.max.y ?? 1;
      applyWind(part.material as MeshStandardMaterial, asset.wind!, height);
      return windDepthMaterial(asset.wind!, height);
    });
  }, [parts, asset.wind]);

  useLayoutEffect(() => {
    for (const part of parts) {
      if (isEmissiveMaterial(part.material)) {
        registerEmissive(part.material as MeshStandardMaterial, assetId);
      }
    }
  }, [parts, assetId]);

  const bases = useMemo(() => {
    const q = new Quaternion();
    const p = new Vector3();
    return placements.map((placement) => {
      const centre = footprintCenterWorld(
        { x: placement.x, z: placement.z },
        asset.footprint,
        placement.rotY,
      );
      p.set(centre.x, 0, centre.z);
      q.setFromAxisAngle(UP, rotationToRadians(placement.rotY));
      return {
        matrix: new Matrix4().compose(p, q, ONE),
        placedAt: new Date(placement.placedAt).getTime(),
      };
    });
  }, [placements, asset.footprint]);

  const writeAll = () => {
    for (const mesh of meshes.current) {
      if (!mesh) continue;
      bases.forEach((base, i) => mesh.setMatrixAt(i, base.matrix));
      mesh.instanceMatrix.needsUpdate = true;
      // Without this, frustum culling uses the base geometry's bounds and
      // props vanish at some camera angles.
      mesh.computeBoundingSphere();
    }
  };

  useLayoutEffect(writeAll, [bases]);

  const revealing = useRef(true);
  useFrame(() => {
    if (!revealing.current) return;
    const anyYoung = applyReveal(meshes.current, bases, Date.now());
    if (!anyYoung) {
      revealing.current = false;
      writeAll();
    }
  });

  // A won piece arriving is the moment bloom is rationed for.
  const spiked = useRef(new Set<string>());
  useLayoutEffect(() => {
    revealing.current = true;
    const now = Date.now();
    placements.forEach((placement, i) => {
      const age = now - (bases[i]?.placedAt ?? now);
      if (age < 0 || age >= REVEAL_MS || spiked.current.has(placement.id))
        return;
      spiked.current.add(placement.id);
      spikeReward(asset.rarity);
    });
  }, [bases, placements, asset.rarity]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!onSelect || event.instanceId === undefined) return;
    const placement = placements[event.instanceId];
    if (!placement) return;
    event.stopPropagation();
    onSelect(placement.id);
  };

  return (
    <>
      {parts.map((part, index) => (
        <instancedMesh
          // Count is fixed at construction, so a new count needs a new mesh.
          key={`${index}-${placements.length}`}
          ref={(el) => {
            meshes.current[index] = el;
          }}
          args={[part.geometry, part.material, placements.length]}
          customDepthMaterial={
            depthMaterials[index] as MeshDepthMaterial | undefined
          }
          castShadow
          receiveShadow
          frustumCulled
          onClick={handleClick}
        />
      ))}
    </>
  );
};

import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { WorldSignals } from '@/domain/types';
import { useAsset } from '@/game/assets/use-asset';

const SPINES = [
  '#c96f4a',
  '#7d9b76',
  '#e8b04b',
  '#8ec5d6',
  '#f2e8d5',
  '#2e4a4e',
];
const MAX_BOOKS = 48;
const PER_ROW = 12;

const bookGeometry = new BoxGeometry(0.14, 0.42, 0.28);
const bookMaterial = new MeshStandardMaterial({ roughness: 0.9 });

// Books are instanced with per-instance colour from a subject hash. Ten
// hours studied is a visibly fuller shelf than one.
const Books = ({ count }: { count: number }) => {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new Matrix4();
    const pos = new Vector3();
    const color = new Color();
    for (let i = 0; i < count; i += 1) {
      const row = Math.floor(i / PER_ROW);
      const col = i % PER_ROW;
      pos.set(-0.85 + col * 0.155, 0.36 + row * 0.66, 0.1);
      matrix.makeTranslation(pos.x, pos.y, pos.z);
      m.setMatrixAt(i, matrix);
      m.setColorAt(i, color.set(SPINES[(i * 7) % SPINES.length]!));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count]);
  if (count === 0) return null;
  return (
    <instancedMesh
      key={count}
      ref={mesh}
      args={[bookGeometry, bookMaterial, count]}
      castShadow
    />
  );
};

const ShelfModel = () => {
  const parts = useAsset('shelf_study');
  return (
    <>
      {parts.map((part, i) => (
        <mesh
          key={i}
          geometry={part.geometry}
          material={part.material}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
};

// A landmark on the rim, outside the buildable grid, facing the island.
export const StudyShelf = ({
  signals,
  radius,
}: {
  signals: WorldSignals;
  radius: number;
}) => {
  const count = useMemo(
    () => Math.min(MAX_BOOKS, Math.round(signals.totalFocusHours * 4)),
    [signals.totalFocusHours],
  );
  return (
    <group position={[0, 0, -radius * 0.8]}>
      <Suspense fallback={null}>
        <ShelfModel />
      </Suspense>
      <Books count={count} />
    </group>
  );
};

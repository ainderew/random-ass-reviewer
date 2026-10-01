'use client';

import { useMemo } from 'react';
import { CylinderGeometry } from 'three';
import { OUTLINE, roundedBox, toon } from './toon';

// The pieces every prop is made of: soft boxes and cylinders in flat toon
// colour with the ink outline, in the palette of the stationery.
export const PLATFORM_RADIUS = 1.5;
export const WALL_RADIUS = PLATFORM_RADIUS - 0.03;

export const WALL = {
  bedroom: '#fbe7dc',
  clinic: '#e2f0ea',
  office: '#ece3f4',
};
export const FLOOR = {
  bedroom: '#f3d2bf',
  clinic: '#cfe5dc',
  office: '#ddd0ea',
};
export const RIM = '#e2b39d';
export const WOOD = '#d9a27c';
export const WOOD_DARK = '#b98361';
export const SHELF = '#e6b892';
export const AMBER = '#f5c08c';
export const TEAL = '#7cc4b4';
export const PAPER = '#fff8f1';
export const METAL = '#b9b4c9';
export const GOLD = '#e3b04b';
export const SKIN = '#e48b72';
export const LILAC = '#b7a2d8';
export const CORAL = '#ee8a72';

export type Vec3 = readonly [number, number, number];

export const Box = ({
  size,
  position,
  color,
  rotation,
  line = true,
}: {
  size: Vec3;
  position: Vec3;
  color: string;
  rotation?: Vec3;
  line?: boolean;
}) => {
  const [w, h, d] = size;
  const geometry = useMemo(() => roundedBox(w, h, d), [w, h, d]);
  return (
    <mesh
      position={position}
      {...(rotation ? { rotation } : {})}
      geometry={geometry}
      material={toon(color)}
    >
      {line ? <mesh geometry={geometry} material={OUTLINE} /> : null}
    </mesh>
  );
};

export const Cyl = ({
  radius,
  height,
  position,
  color,
  rotation,
  radiusTop,
  line = true,
}: {
  radius: number;
  height: number;
  position: Vec3;
  color: string;
  rotation?: Vec3;
  radiusTop?: number;
  line?: boolean;
}) => {
  const top = radiusTop ?? radius;
  const geometry = useMemo(
    () => new CylinderGeometry(top, radius, height, 24),
    [top, radius, height],
  );
  return (
    <mesh
      position={position}
      {...(rotation ? { rotation } : {})}
      geometry={geometry}
      material={toon(color)}
    >
      {line ? <mesh geometry={geometry} material={OUTLINE} /> : null}
    </mesh>
  );
};

// Somewhere on the back wall: angle around the platform, height, and a
// rotation so the piece faces the middle of the room.
export function onWall(
  angle: number,
  y: number,
  inset = 0.06,
): { position: Vec3; rotation: Vec3 } {
  const r = WALL_RADIUS - inset;
  return {
    position: [r * Math.sin(angle), y, r * Math.cos(angle)],
    rotation: [0, angle + Math.PI, 0],
  };
}

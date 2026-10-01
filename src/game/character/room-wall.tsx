'use client';

import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { OUTLINE, toon } from './toon';
import {
  Box,
  CORAL,
  Cyl,
  GOLD,
  LILAC,
  METAL,
  PAPER,
  SHELF,
  SKIN,
  TEAL,
  WOOD,
  WOOD_DARK,
  onWall,
} from './room-kit';

// What hangs on the back wall. Most of it arrives with a milestone.

const useSkyTexture = () =>
  useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, '#a493d4');
    gradient.addColorStop(1, '#f5c3ab');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 64);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);

export const Window = () => {
  const sky = useSkyTexture();
  const place = onWall(Math.PI, 0.86);
  return (
    <group position={place.position} rotation={place.rotation}>
      <Box size={[0.64, 0.5, 0.05]} position={[0, 0, 0]} color={PAPER} />
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.54, 0.4]} />
        {sky ? (
          <meshBasicMaterial map={sky} />
        ) : (
          <meshBasicMaterial color="#c9a9c4" />
        )}
      </mesh>
      <Box
        size={[0.02, 0.4, 0.02]}
        position={[0, 0, 0.04]}
        color={PAPER}
        line={false}
      />
      <Box
        size={[0.54, 0.02, 0.02]}
        position={[0, 0, 0.04]}
        color={PAPER}
        line={false}
      />
    </group>
  );
};

const SPINES = [GOLD, TEAL, LILAC, PAPER, CORAL, TEAL];

export const Bookshelf = ({
  shelves,
  scrubs,
}: {
  shelves: 0 | 1 | 2;
  scrubs: boolean;
}) => {
  const place = onWall(Math.PI + 0.85, 0.55, 0.2);
  return (
    <group position={place.position} rotation={place.rotation}>
      <Box size={[0.62, 1.1, 0.28]} position={[0, 0, 0]} color={WOOD} />
      <Box
        size={[0.56, 0.03, 0.24]}
        position={[0, 0.18, 0.03]}
        color={SHELF}
        line={false}
      />
      <Box
        size={[0.56, 0.03, 0.24]}
        position={[0, -0.2, 0.03]}
        color={SHELF}
        line={false}
      />
      {shelves >= 1
        ? SPINES.map((color, i) => (
            <Box
              key={`a${i}`}
              size={[0.06, 0.24 + (i % 2) * 0.03, 0.18]}
              position={[-0.24 + i * 0.09, 0.32, 0.05]}
              color={color}
            />
          ))
        : null}
      {shelves >= 2
        ? SPINES.map((color, i) => (
            <Box
              key={`b${i}`}
              size={[0.06, 0.22 + ((i + 1) % 2) * 0.03, 0.18]}
              position={[-0.24 + i * 0.09, -0.07, 0.05]}
              color={SPINES[(i + 2) % SPINES.length] ?? color}
            />
          ))
        : null}
      {scrubs ? (
        <Box
          size={[0.24, 0.07, 0.18]}
          position={[0.1, 0.59, 0]}
          color="#6fb8a8"
        />
      ) : null}
    </group>
  );
};

export const Poster = () => {
  const place = onWall(Math.PI + 0.42, 0.85);
  return (
    <group position={place.position} rotation={place.rotation}>
      <mesh material={toon(PAPER)}>
        <planeGeometry args={[0.32, 0.42]} />
      </mesh>
      <Box
        size={[0.014, 0.2, 0.01]}
        position={[0, -0.02, 0.006]}
        color={SKIN}
        line={false}
      />
      <Box
        size={[0.16, 0.014, 0.01]}
        position={[0, 0.04, 0.006]}
        color={SKIN}
        line={false}
      />
      <Cyl
        radius={0.04}
        height={0.01}
        position={[0, 0.13, 0.006]}
        color={SKIN}
        rotation={[Math.PI / 2, 0, 0]}
        line={false}
      />
    </group>
  );
};

export const Diploma = () => {
  const place = onWall(Math.PI - 0.42, 0.9);
  return (
    <group position={place.position} rotation={place.rotation}>
      <Box size={[0.4, 0.3, 0.03]} position={[0, 0, 0]} color={GOLD} />
      <mesh position={[0, 0, 0.02]} material={toon(PAPER)}>
        <planeGeometry args={[0.32, 0.22]} />
      </mesh>
      <Box
        size={[0.2, 0.012, 0.01]}
        position={[0, 0.03, 0.03]}
        color={METAL}
        line={false}
      />
      <Box
        size={[0.14, 0.012, 0.01]}
        position={[0, -0.02, 0.03]}
        color={METAL}
        line={false}
      />
    </group>
  );
};

export const Stethoscope = () => {
  const place = onWall(Math.PI - 0.82, 0.95);
  return (
    <group position={place.position} rotation={place.rotation}>
      <mesh position={[0, 0.12, 0.02]} material={toon(METAL)}>
        <sphereGeometry args={[0.02, 12, 12]} />
      </mesh>
      <mesh position={[0, -0.02, 0.02]} material={toon(METAL)}>
        <torusGeometry args={[0.1, 0.014, 8, 32]} />
        <mesh material={OUTLINE}>
          <torusGeometry args={[0.1, 0.014, 8, 32]} />
        </mesh>
      </mesh>
      <Cyl
        radius={0.012}
        height={0.22}
        position={[0, -0.22, 0.02]}
        color={METAL}
      />
      <Cyl
        radius={0.045}
        height={0.02}
        position={[0, -0.34, 0.02]}
        color={WOOD_DARK}
      />
    </group>
  );
};

export const CoatHook = () => {
  const place = onWall(Math.PI - 1.15, 0.75);
  return (
    <group position={place.position} rotation={place.rotation}>
      <mesh position={[0, 0.24, 0.02]} material={toon(METAL)}>
        <sphereGeometry args={[0.022, 12, 12]} />
      </mesh>
      <Box size={[0.22, 0.44, 0.05]} position={[0, 0, 0.03]} color={PAPER} />
      <Box
        size={[0.03, 0.14, 0.012]}
        position={[0, 0.14, 0.06]}
        color={METAL}
        line={false}
      />
    </group>
  );
};

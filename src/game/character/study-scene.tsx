'use client';

import { useMemo } from 'react';
import { BackSide, CanvasTexture, SRGBColorSpace } from 'three';
import type { sceneState } from '@/domain/career/milestones';

export type SceneState = ReturnType<typeof sceneState>;

// A round platform with a curved back wall: the room she has earned so far,
// seen from the front like a diorama. Every prop is a few boxes in the
// palette; the milestones switch them on.
export const PLATFORM_RADIUS = 1.5;
const WALL_RADIUS = PLATFORM_RADIUS - 0.03;

export type SpotName = 'desk' | 'shelf' | 'window' | 'front';
export interface Spot {
  position: readonly [number, number, number];
  // Rotation about y once she arrives. 0 faces the camera.
  facing: number;
}
export const SPOTS: Record<SpotName, Spot> = {
  desk: { position: [0.55, 0, -0.95], facing: 0 },
  shelf: { position: [-0.62, 0, -0.42], facing: -Math.PI * 0.72 },
  window: { position: [-0.02, 0, -0.9], facing: Math.PI },
  front: { position: [0.1, 0, 0.45], facing: 0.15 },
};

const WALL = { bedroom: '#1f2433', clinic: '#1c2d31', office: '#272235' };
const FLOOR = { bedroom: '#2b3145', clinic: '#2a3c40', office: '#332c44' };
const RIM = '#181b26';
const WOOD = '#3a3f55';
const WOOD_DARK = '#2e3446';
const SHELF = '#454b66';
const AMBER = '#e8b04b';
const TEAL = '#6fd6c4';
const PAPER = '#e9e5da';
const METAL = '#a7adc0';
const GOLD = '#c9932f';
const SKIN = '#c07a4a';

type Vec3 = readonly [number, number, number];

const Box = ({
  size,
  position,
  color,
  rotation,
}: {
  size: Vec3;
  position: Vec3;
  color: string;
  rotation?: Vec3;
}) => (
  <mesh position={position} {...(rotation ? { rotation } : {})}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.9} />
  </mesh>
);

const Cyl = ({
  radius,
  height,
  position,
  color,
  rotation,
  radiusTop,
}: {
  radius: number;
  height: number;
  position: Vec3;
  color: string;
  rotation?: Vec3;
  radiusTop?: number;
}) => (
  <mesh position={position} {...(rotation ? { rotation } : {})}>
    <cylinderGeometry args={[radiusTop ?? radius, radius, height, 24]} />
    <meshStandardMaterial color={color} roughness={0.9} />
  </mesh>
);

// Somewhere on the back wall: angle around the platform, height, and a
// rotation so the piece faces the middle of the room.
const onWall = (
  angle: number,
  y: number,
  inset = 0.06,
): { position: Vec3; rotation: Vec3 } => {
  const r = WALL_RADIUS - inset;
  return {
    position: [r * Math.sin(angle), y, r * Math.cos(angle)],
    rotation: [0, angle + Math.PI, 0],
  };
};

const useSkyTexture = () =>
  useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, '#3b3f6b');
    gradient.addColorStop(1, '#c07a4a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 64);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);

const Window = () => {
  const sky = useSkyTexture();
  const place = onWall(Math.PI, 0.82);
  return (
    <group position={place.position} rotation={place.rotation}>
      <Box size={[0.64, 0.5, 0.05]} position={[0, 0, 0]} color={WOOD_DARK} />
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.56, 0.42]} />
        {sky ? (
          <meshBasicMaterial map={sky} />
        ) : (
          <meshBasicMaterial color="#7a5a6b" />
        )}
      </mesh>
      <Box
        size={[0.02, 0.42, 0.02]}
        position={[0, 0, 0.035]}
        color={WOOD_DARK}
      />
    </group>
  );
};

const Bookshelf = ({
  shelves,
  scrubs,
}: {
  shelves: 0 | 1 | 2;
  scrubs: boolean;
}) => {
  const place = onWall(Math.PI + 0.85, 0.55, 0.2);
  const spines = [GOLD, TEAL, METAL, PAPER, GOLD, TEAL];
  return (
    <group position={place.position} rotation={place.rotation}>
      <Box size={[0.62, 1.1, 0.28]} position={[0, 0, 0]} color={WOOD} />
      <Box size={[0.56, 0.02, 0.24]} position={[0, 0.18, 0.02]} color={SHELF} />
      <Box size={[0.56, 0.02, 0.24]} position={[0, -0.2, 0.02]} color={SHELF} />
      {shelves >= 1
        ? spines.map((color, i) => (
            <Box
              key={`a${i}`}
              size={[0.06, 0.24 + (i % 2) * 0.03, 0.18]}
              position={[-0.24 + i * 0.09, 0.32, 0.04]}
              color={color}
            />
          ))
        : null}
      {shelves >= 2
        ? spines.map((color, i) => (
            <Box
              key={`b${i}`}
              size={[0.06, 0.22 + ((i + 1) % 2) * 0.03, 0.18]}
              position={[-0.24 + i * 0.09, -0.07, 0.04]}
              color={spines[(i + 2) % spines.length] ?? color}
            />
          ))
        : null}
      {scrubs ? (
        <Box
          size={[0.24, 0.07, 0.18]}
          position={[0.1, 0.59, 0]}
          color="#4f9c8e"
        />
      ) : null}
    </group>
  );
};

const Poster = () => {
  const place = onWall(Math.PI + 0.42, 0.85);
  return (
    <group position={place.position} rotation={place.rotation}>
      <mesh>
        <planeGeometry args={[0.32, 0.42]} />
        <meshStandardMaterial color={PAPER} roughness={1} />
      </mesh>
      <Box
        size={[0.012, 0.2, 0.01]}
        position={[0, -0.02, 0.006]}
        color={SKIN}
      />
      <Box
        size={[0.16, 0.012, 0.01]}
        position={[0, 0.04, 0.006]}
        color={SKIN}
      />
      <Cyl
        radius={0.04}
        height={0.01}
        position={[0, 0.13, 0.006]}
        color={SKIN}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
};

const Diploma = () => {
  const place = onWall(Math.PI - 0.42, 0.9);
  return (
    <group position={place.position} rotation={place.rotation}>
      <Box size={[0.4, 0.3, 0.03]} position={[0, 0, 0]} color={GOLD} />
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.32, 0.22]} />
        <meshStandardMaterial color={PAPER} roughness={1} />
      </mesh>
      <Box size={[0.2, 0.01, 0.01]} position={[0, 0.03, 0.03]} color={METAL} />
      <Box
        size={[0.14, 0.01, 0.01]}
        position={[0, -0.02, 0.03]}
        color={METAL}
      />
    </group>
  );
};

const Stethoscope = () => {
  const place = onWall(Math.PI - 0.82, 0.95);
  return (
    <group position={place.position} rotation={place.rotation}>
      <mesh position={[0, 0.12, 0.02]}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <mesh position={[0, -0.02, 0.02]}>
        <torusGeometry args={[0.1, 0.012, 8, 32]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <Cyl
        radius={0.01}
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

const CoatHook = () => {
  const place = onWall(Math.PI - 1.15, 0.75);
  return (
    <group position={place.position} rotation={place.rotation}>
      <mesh position={[0, 0.24, 0.02]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <Box size={[0.22, 0.44, 0.05]} position={[0, 0, 0.03]} color={PAPER} />
      <Box size={[0.03, 0.14, 0.01]} position={[0, 0.14, 0.06]} color={METAL} />
    </group>
  );
};

const Desk = ({
  lampOn,
  notebook,
  nameplate,
}: {
  lampOn: boolean;
  notebook: boolean;
  nameplate: boolean;
}) => (
  <group position={[0.55, 0, -0.55]}>
    <Box size={[0.96, 0.05, 0.44]} position={[0, 0.45, 0]} color={WOOD} />
    {[-0.44, 0.44].map((x) =>
      [-0.18, 0.18].map((z) => (
        <Box
          key={`${x}${z}`}
          size={[0.04, 0.44, 0.04]}
          position={[x, 0.22, z]}
          color={WOOD_DARK}
        />
      )),
    )}
    {/* Laptop to her right, so her face stays clear of the screen. */}
    <Box
      size={[0.3, 0.015, 0.2]}
      position={[0.26, 0.48, 0.02]}
      color={WOOD_DARK}
    />
    <Box
      size={[0.3, 0.2, 0.015]}
      position={[0.26, 0.58, -0.09]}
      color="#3b3f6b"
      rotation={[-0.25, 0, 0]}
    />
    {/* Lamp on the left end. */}
    <Cyl
      radius={0.07}
      height={0.02}
      position={[-0.34, 0.485, 0.05]}
      color={METAL}
    />
    <Cyl
      radius={0.012}
      height={0.3}
      position={[-0.32, 0.63, 0.02]}
      color={METAL}
      rotation={[0, 0, -0.2]}
    />
    <Cyl
      radius={0.1}
      radiusTop={0.03}
      height={0.11}
      position={[-0.27, 0.78, 0]}
      color={lampOn ? AMBER : WOOD}
    />
    {lampOn ? (
      <pointLight
        position={[-0.27, 0.72, 0.05]}
        color="#ffb84a"
        intensity={2.2}
        distance={2.6}
        decay={2}
      />
    ) : null}
    {notebook ? (
      <Box
        size={[0.16, 0.015, 0.12]}
        position={[-0.02, 0.48, 0.04]}
        color={TEAL}
      />
    ) : null}
    {nameplate ? (
      <Box size={[0.24, 0.06, 0.02]} position={[-0.3, 0.5, 0.2]} color={GOLD} />
    ) : null}
  </group>
);

const Chair = () => (
  <group position={[0.55, 0, -0.95]}>
    <Box size={[0.36, 0.04, 0.36]} position={[0, 0.27, 0]} color={WOOD_DARK} />
    <Box
      size={[0.36, 0.34, 0.04]}
      position={[0, 0.46, -0.16]}
      color={WOOD_DARK}
    />
    {[-0.15, 0.15].map((x) =>
      [-0.15, 0.15].map((z) => (
        <Box
          key={`${x}${z}`}
          size={[0.03, 0.27, 0.03]}
          position={[x, 0.13, z]}
          color={WOOD}
        />
      )),
    )}
  </group>
);

const ExamTable = () => (
  <group position={[-0.55, 0, 0.12]} rotation={[0, 0.35, 0]}>
    <Box size={[0.88, 0.06, 0.4]} position={[0, 0.42, 0]} color={TEAL} />
    <Box size={[0.2, 0.06, 0.28]} position={[-0.3, 0.48, 0]} color={PAPER} />
    {[-0.38, 0.38].map((x) => (
      <Box
        key={x}
        size={[0.05, 0.4, 0.3]}
        position={[x, 0.2, 0]}
        color={METAL}
      />
    ))}
  </group>
);

const AnatomyModel = () => (
  <group position={[1.12, 0, -0.3]}>
    <Cyl
      radius={0.14}
      height={0.03}
      position={[0, 0.015, 0]}
      color={WOOD_DARK}
    />
    <Cyl radius={0.015} height={0.7} position={[0, 0.38, 0]} color={METAL} />
    <mesh position={[0, 0.72, 0]}>
      <capsuleGeometry args={[0.07, 0.24, 4, 12]} />
      <meshStandardMaterial color={PAPER} roughness={1} />
    </mesh>
    <mesh position={[0, 0.98, 0]}>
      <sphereGeometry args={[0.075, 14, 14]} />
      <meshStandardMaterial color={PAPER} roughness={1} />
    </mesh>
  </group>
);

const Vehicle = ({ kind }: { kind: 'bicycle' | 'car' | 'nicer-car' }) => {
  const at: Vec3 = [-0.92, 0, 0.72];
  if (kind === 'bicycle')
    return (
      <group position={at} rotation={[0, 0.9, 0]}>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.14, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.13, 0.012, 8, 28]} />
            <meshStandardMaterial color={PAPER} />
          </mesh>
        ))}
        <Box
          size={[0.3, 0.02, 0.02]}
          position={[0, 0.24, 0]}
          color={PAPER}
          rotation={[0, 0, 0.35]}
        />
        <Box
          size={[0.02, 0.2, 0.02]}
          position={[0.08, 0.25, 0]}
          color={PAPER}
        />
      </group>
    );
  const gold = kind === 'nicer-car';
  return (
    <group position={at} rotation={[0, 0.6, 0]}>
      <Box
        size={[gold ? 0.74 : 0.62, gold ? 0.14 : 0.18, 0.32]}
        position={[0, gold ? 0.16 : 0.18, 0]}
        color={gold ? AMBER : METAL}
      />
      <Box
        size={[0.36, 0.14, 0.28]}
        position={[gold ? -0.06 : 0, gold ? 0.3 : 0.34, 0]}
        color={gold ? '#3b3f6b' : '#8b91a8'}
      />
      {[-0.22, 0.22].map((x) =>
        [-0.17, 0.17].map((z) => (
          <Cyl
            key={`${x}${z}`}
            radius={0.07}
            height={0.05}
            position={[x, 0.07, z]}
            color={RIM}
            rotation={[Math.PI / 2, 0, 0]}
          />
        )),
      )}
    </group>
  );
};

export const StudyRoom = ({ scene }: { scene: SceneState }) => {
  const has = (id: string) => scene.items.has(id);
  return (
    <group>
      {/* Platform and its dark rim. */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry
          args={[PLATFORM_RADIUS, PLATFORM_RADIUS * 0.97, 0.2, 56]}
        />
        <meshStandardMaterial color={FLOOR[scene.room]} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.26, 0]}>
        <cylinderGeometry
          args={[PLATFORM_RADIUS * 0.97, PLATFORM_RADIUS * 0.9, 0.14, 56]}
        />
        <meshStandardMaterial color={RIM} roughness={1} />
      </mesh>
      {/* The back wall, open toward us. */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry
          args={[
            WALL_RADIUS,
            WALL_RADIUS,
            1.24,
            56,
            1,
            true,
            Math.PI * 0.55,
            Math.PI * 0.9,
          ]}
        />
        <meshStandardMaterial
          color={WALL[scene.room]}
          roughness={1}
          side={BackSide}
        />
      </mesh>
      <Window />
      <Bookshelf shelves={scene.shelves} scrubs={scene.wardrobe !== 'hoodie'} />
      <Desk
        lampOn={has('lamp')}
        notebook={has('notebook')}
        nameplate={has('nameplate')}
      />
      <Chair />
      {has('poster') ? <Poster /> : null}
      {has('diploma') ? <Diploma /> : null}
      {has('stethoscope') ? <Stethoscope /> : null}
      {scene.wardrobe === 'coat' ? <CoatHook /> : null}
      {scene.room !== 'bedroom' && has('exam-table') ? <ExamTable /> : null}
      {has('skeleton') ? <AnatomyModel /> : null}
      {scene.vehicle !== 'none' ? <Vehicle kind={scene.vehicle} /> : null}
    </group>
  );
};

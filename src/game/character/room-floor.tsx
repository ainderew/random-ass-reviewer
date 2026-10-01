'use client';

import { OUTLINE, toon } from './toon';
import {
  AMBER,
  Box,
  CORAL,
  Cyl,
  GOLD,
  LILAC,
  METAL,
  PAPER,
  TEAL,
  WOOD,
  WOOD_DARK,
  type Vec3,
} from './room-kit';

// What stands on the floor: the desk and chair at the back, the cat's
// cushion at the front, and the milestone furniture round the edges.

export const CUSHION_AT: Vec3 = [0, 0, 0.42];

export const Cushion = () => (
  <group position={CUSHION_AT} scale={0.85}>
    <mesh position={[0, 0.012, 0]} material={toon('#efe2f5')}>
      <cylinderGeometry args={[1.05, 1.05, 0.02, 56]} />
    </mesh>
    <mesh
      position={[0, 0.1, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      scale={[1, 1, 0.7]}
      material={toon(CORAL)}
    >
      <torusGeometry args={[0.5, 0.14, 20, 64]} />
      <mesh material={OUTLINE}>
        <torusGeometry args={[0.5, 0.14, 20, 64]} />
      </mesh>
    </mesh>
    <mesh
      position={[0, 0.12, 0]}
      scale={[0.52, 0.1, 0.52]}
      material={toon('#f39b84')}
    >
      <sphereGeometry args={[1, 40, 20]} />
    </mesh>
  </group>
);

// The lamp, notebook and nameplate sit at the right end, where the cat
// does not hide them.
export const Desk = ({
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
    <Box
      size={[0.3, 0.015, 0.2]}
      position={[-0.08, 0.48, 0.02]}
      color={METAL}
    />
    <Box
      size={[0.3, 0.2, 0.015]}
      position={[-0.08, 0.58, -0.09]}
      color="#8e7fc7"
      rotation={[-0.25, 0, 0]}
    />
    <Cyl
      radius={0.07}
      height={0.02}
      position={[0.34, 0.485, 0.05]}
      color={METAL}
    />
    <Cyl
      radius={0.012}
      height={0.3}
      position={[0.32, 0.63, 0.02]}
      color={METAL}
      rotation={[0, 0, 0.2]}
    />
    <Cyl
      radius={0.1}
      radiusTop={0.03}
      height={0.11}
      position={[0.27, 0.78, 0]}
      color={lampOn ? AMBER : PAPER}
    />
    {lampOn ? (
      <pointLight
        position={[0.27, 0.72, 0.05]}
        color="#ffb84a"
        intensity={2.2}
        distance={2.6}
        decay={2}
      />
    ) : null}
    {notebook ? (
      <Box
        size={[0.16, 0.015, 0.12]}
        position={[0.1, 0.48, 0.06]}
        color={TEAL}
      />
    ) : null}
    {nameplate ? (
      <Box size={[0.24, 0.06, 0.02]} position={[0.28, 0.5, 0.2]} color={GOLD} />
    ) : null}
  </group>
);

export const Chair = () => (
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

// Along the left wall, clear of the cushion.
export const ExamTable = () => (
  <group position={[-0.98, 0, -0.12]} rotation={[0, 1.25, 0]}>
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

export const AnatomyModel = () => (
  <group position={[1.12, 0, -0.3]}>
    <Cyl
      radius={0.14}
      height={0.03}
      position={[0, 0.015, 0]}
      color={WOOD_DARK}
    />
    <Cyl radius={0.015} height={0.7} position={[0, 0.38, 0]} color={METAL} />
    <mesh position={[0, 0.72, 0]} material={toon(PAPER)}>
      <capsuleGeometry args={[0.07, 0.24, 4, 12]} />
      <mesh material={OUTLINE}>
        <capsuleGeometry args={[0.07, 0.24, 4, 12]} />
      </mesh>
    </mesh>
    <mesh position={[0, 0.98, 0]} material={toon(PAPER)}>
      <sphereGeometry args={[0.075, 14, 14]} />
      <mesh material={OUTLINE}>
        <sphereGeometry args={[0.075, 14, 14]} />
      </mesh>
    </mesh>
  </group>
);

export const Vehicle = ({
  kind,
}: {
  kind: 'bicycle' | 'car' | 'nicer-car';
}) => {
  const at: Vec3 = [-0.92, 0, 0.72];
  if (kind === 'bicycle')
    return (
      <group position={at} rotation={[0, 0.9, 0]}>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.14, 0]} material={toon(LILAC)}>
            <torusGeometry args={[0.13, 0.014, 8, 28]} />
            <mesh material={OUTLINE}>
              <torusGeometry args={[0.13, 0.014, 8, 28]} />
            </mesh>
          </mesh>
        ))}
        <Box
          size={[0.3, 0.024, 0.024]}
          position={[0, 0.24, 0]}
          color={CORAL}
          rotation={[0, 0, 0.35]}
        />
        <Box
          size={[0.024, 0.2, 0.024]}
          position={[0.08, 0.25, 0]}
          color={CORAL}
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
        color="#c9d6ee"
      />
      {[-0.22, 0.22].map((x) =>
        [-0.17, 0.17].map((z) => (
          <Cyl
            key={`${x}${z}`}
            radius={0.07}
            height={0.05}
            position={[x, 0.07, z]}
            color="#5e5068"
            rotation={[Math.PI / 2, 0, 0]}
          />
        )),
      )}
    </group>
  );
};

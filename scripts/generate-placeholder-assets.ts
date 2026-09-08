import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { documentFromBuilders, getIO, type EmissiveOptions } from './lib/gltf';
import { MeshBuilder, hexToLinear, type Rgb } from './lib/mesh-builder';

// Procedural stand-ins in the cozy low-poly palette from CHATGPT-PROMPT-PACK.md.
// They exist so the pipeline, manifest, and island are real today. Drop
// Tripo3D exports with the same ids into assets/raw to replace them.

const P = {
  terracotta: hexToLinear('#C96F4A'),
  sage: hexToLinear('#7D9B76'),
  cream: hexToLinear('#F2E8D5'),
  teal: hexToLinear('#2E4A4E'),
  amber: hexToLinear('#E8B04B'),
  sky: hexToLinear('#8EC5D6'),
  sageDeep: hexToLinear('#5F7A59'),
  rock: hexToLinear('#8C5A46'),
} satisfies Record<string, Rgb>;

type Part = { builder: MeshBuilder; options?: EmissiveOptions };

// Unit island: radius 1 at the top. The scene scales it to the tile count.
function islandBase(): Part[] {
  const b = new MeshBuilder();
  b.lathe(
    [
      [0, -1.35, P.teal],
      [0.2, -1.15, P.teal],
      [0.6, -0.72, P.rock],
      [0.93, -0.32, P.rock],
      [1.0, -0.22, P.sageDeep],
      [1.0, 0, P.sage],
    ],
    14,
  );
  return [{ builder: b }];
}

function grassTuft(): Part[] {
  const b = new MeshBuilder();
  // Sized to read from the default camera distance: a tile is 2 units.
  const blades: Array<[number, number, number, number]> = [
    [0, 0, 0.95, 0.2],
    [0.42, 0.18, 0.72, 0.16],
    [-0.38, 0.28, 0.8, 0.16],
    [0.2, -0.45, 0.64, 0.15],
    [-0.28, -0.38, 0.58, 0.14],
  ];
  for (const [x, z, h, r] of blades) b.cone([x, 0, z], r, h, 5, P.sage);
  return [{ builder: b }];
}

function benchWood(): Part[] {
  const b = new MeshBuilder();
  b.box([0, 0.42, 0], [1.3, 0.08, 0.42], P.terracotta);
  b.box([0, 0.72, -0.18], [1.3, 0.34, 0.06], P.terracotta);
  for (const x of [-0.52, 0.52]) {
    b.box([x, 0.2, 0.12], [0.08, 0.4, 0.08], P.teal);
    b.box([x, 0.45, -0.14], [0.08, 0.9, 0.08], P.teal);
  }
  return [{ builder: b }];
}

function lanternBrass(): Part[] {
  const post = new MeshBuilder();
  post.cylinder([0, 0, 0], 0.16, 0.08, 8, P.teal);
  post.cylinder([0, 0.08, 0], 0.045, 1.35, 6, P.teal);
  post.box([0, 1.36, 0], [0.4, 0.05, 0.4], P.teal);
  post.cone([0, 1.78, 0], 0.26, 0.2, 4, P.teal);
  const glass = new MeshBuilder();
  glass.box([0, 1.58, 0], [0.3, 0.38, 0.3], P.amber);
  return [
    { builder: post },
    {
      builder: glass,
      options: { emissive: [1, 0.68, 0.25], materialName: 'emissive_glass' },
    },
  ];
}

function treeRound(): Part[] {
  const b = new MeshBuilder();
  b.cylinder([0, 0, 0], 0.11, 0.7, 7, P.rock);
  b.lathe(
    [
      [0.12, 0.55, P.sage],
      [0.5, 0.8, P.sage],
      [0.62, 1.15, P.sage],
      [0.45, 1.5, P.sageDeep],
      [0, 1.7, P.sageDeep],
    ],
    9,
    [0, 0, 0],
  );
  return [{ builder: b }];
}

function cottageScholar(): Part[] {
  const b = new MeshBuilder();
  // Walls sit inside a 2x2 footprint (3.4 world units), with a margin.
  b.box([0, 0.65, 0], [2.6, 1.3, 2.2], P.cream);
  b.box([0, 1.78, 0], [2.9, 0.12, 2.5], P.terracotta);
  b.lathe(
    [
      [2.05, 1.82, P.terracotta],
      [0, 2.9, P.terracotta],
    ],
    4,
    [0, 0, 0],
    Math.PI / 4,
  );
  b.box([0.55, 1.7, 0.55], [0.3, 1.3, 0.3], P.rock); // chimney
  b.box([0, 0.45, 1.11], [0.5, 0.9, 0.04], P.teal); // door
  b.box([-0.8, 0.85, 1.11], [0.45, 0.45, 0.04], P.sky); // window
  b.box([0.8, 0.85, 1.11], [0.45, 0.45, 0.04], P.sky);
  return [{ builder: b }];
}

// Stylised walker: robe cone, head, book under one arm. Faces +z.
function scholarRobed(): Part[] {
  const b = new MeshBuilder();
  b.lathe(
    [
      [0.26, 0, P.teal],
      [0.24, 0.55, P.teal],
      [0.16, 0.95, P.cream],
    ],
    7,
  );
  b.lathe(
    [
      [0, 0.98, P.cream],
      [0.15, 1.08, P.cream],
      [0.15, 1.24, P.cream],
      [0, 1.32, P.cream],
    ],
    7,
  );
  b.box([0.22, 0.62, 0.14], [0.12, 0.18, 0.24], P.terracotta); // book
  return [{ builder: b }];
}

// Empty bookcase; the books are instanced at runtime from real study hours.
function shelfStudy(): Part[] {
  const b = new MeshBuilder();
  b.box([0, 0.9, 0], [2.2, 1.8, 0.5], P.rock);
  b.box([0, 0.9, 0.06], [1.95, 1.55, 0.42], P.teal);
  b.box([0, 0.55, 0.1], [1.95, 0.06, 0.4], P.rock);
  b.box([0, 1.2, 0.1], [1.95, 0.06, 0.4], P.rock);
  return [{ builder: b }];
}

// Rare: a basin, a pillar, and a disc of water.
function fountainStone(): Part[] {
  const b = new MeshBuilder();
  b.lathe(
    [
      [0.5, 0, P.rock],
      [0.62, 0.12, P.cream],
      [0.6, 0.42, P.cream],
      [0.48, 0.46, P.cream],
    ],
    10,
  );
  b.cylinder([0, 0.44, 0], 0.46, 0.04, 10, P.sky);
  b.cylinder([0, 0.46, 0], 0.08, 0.7, 7, P.cream);
  b.lathe(
    [
      [0.22, 1.12, P.cream],
      [0.26, 1.2, P.cream],
      [0, 1.28, P.cream],
    ],
    8,
  );
  return [{ builder: b }];
}

// Epic: a brass orrery. Base, stem, three rings, a sun.
function orreryBrass(): Part[] {
  const b = new MeshBuilder();
  b.cylinder([0, 0, 0], 0.4, 0.1, 10, P.teal);
  b.cylinder([0, 0.1, 0], 0.05, 0.9, 6, P.amber);
  for (const [r, y, tilt] of [
    [0.55, 1.0, 0],
    [0.42, 1.05, 0.5],
    [0.3, 1.1, 1.0],
  ] as const) {
    const ring = new MeshBuilder();
    ring.lathe(
      [
        [r - 0.03, -0.02, P.amber],
        [r + 0.03, -0.02, P.amber],
        [r + 0.03, 0.02, P.amber],
        [r - 0.03, 0.02, P.amber],
        [r - 0.03, -0.02, P.amber],
      ],
      16,
      [0, 0, 0],
    );
    // Tilt each ring by rotating its vertices around x.
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    for (let i = 0; i < ring.positions.length; i += 3) {
      const py = ring.positions[i + 1]!;
      const pz = ring.positions[i + 2]!;
      ring.positions[i + 1] = py * c - pz * s + y;
      ring.positions[i + 2] = py * s + pz * c;
      const ny = ring.normals[i + 1]!;
      const nz = ring.normals[i + 2]!;
      ring.normals[i + 1] = ny * c - nz * s;
      ring.normals[i + 2] = ny * s + nz * c;
    }
    b.positions.push(...ring.positions);
    b.normals.push(...ring.normals);
    b.colors.push(...ring.colors);
  }
  const sun = new MeshBuilder();
  sun.lathe(
    [
      [0, 0.92, P.amber],
      [0.1, 0.98, P.amber],
      [0.1, 1.1, P.amber],
      [0, 1.16, P.amber],
    ],
    8,
  );
  return [
    { builder: b },
    {
      builder: sun,
      options: { emissive: [1, 0.72, 0.3], materialName: 'emissive_sun' },
    },
  ];
}

const ASSETS: Record<string, () => Part[]> = {
  fountain_stone: fountainStone,
  orrery_brass: orreryBrass,
  scholar_robed: scholarRobed,
  shelf_study: shelfStudy,
  island_base_meadow: islandBase,
  grass_tuft: grassTuft,
  bench_wood: benchWood,
  lantern_brass: lanternBrass,
  tree_round: treeRound,
  cottage_scholar: cottageScholar,
};

async function main(): Promise<void> {
  const outDir = path.resolve(__dirname, '..', 'assets', 'raw');
  await mkdir(outDir, { recursive: true });
  const io = await getIO();
  for (const [id, build] of Object.entries(ASSETS)) {
    const parts = build();
    const doc = documentFromBuilders(id, parts);
    await io.write(path.join(outDir, `${id}.glb`), doc);
    const tris = parts.reduce((n, p) => n + p.builder.triangleCount, 0);
    console.log(`${id.padEnd(22)} ${String(tris).padStart(5)} tris`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

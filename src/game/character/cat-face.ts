import {
  CapsuleGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  SphereGeometry,
  TorusGeometry,
  type Mesh,
} from 'three';
import type { CatMaterials } from './cat-coats';
import type { Part } from './cat-parts';
import { lathe } from './toon';

// Her face: big low eyes that swap for arcs when she is happy or asleep, a
// two-bump muzzle, blush, whiskers, and ears on pivots so they can flick.
export interface CatEye {
  open: Group;
  pupil: Mesh;
  happy: Mesh;
  closed: Mesh;
  side: -1 | 1;
}
export interface CatFace {
  ears: [Group, Group];
  eyes: CatEye[];
  mouth: Mesh;
  stripes: Group;
}

const small = new SphereGeometry(1, 20, 14);
const disc = new CircleGeometry(1, 32);
const arc = new TorusGeometry(0.05, 0.012, 8, 24, Math.PI);
const whisker = new CylinderGeometry(0.0045, 0.0045, 0.19, 5);
const stripe = new CapsuleGeometry(0.016, 0.05, 4, 8);
const ear = lathe(
  [
    [0.15, -0.06],
    [0.15, 0.02],
    [0.12, 0.11],
    [0.07, 0.19],
    [0, 0.235],
  ],
  32,
  24,
);
const SIDES = [-1, 1] as const;

export function buildFace(head: Group, m: CatMaterials, part: Part): CatFace {
  const makeEar = (side: -1 | 1) => {
    const pivot = new Group();
    pivot.position.set(side * 0.25, 0.22, -0.03);
    head.add(pivot);
    part(pivot, ear, m.coat, { scale: [1, 1, 0.6], zone: 'ear' });
    part(pivot, ear, m.earIn, {
      at: [0, 0.015, 0.055],
      scale: [0.62, 0.72, 0.3],
      line: false,
    });
    return pivot;
  };

  const makeEye = (side: -1 | 1): CatEye => {
    const g = new Group();
    g.position.set(side * 0.155, 0.02, 0.338);
    g.rotation.y = side * 0.38;
    head.add(g);
    const open = new Group();
    g.add(open);
    part(open, small, m.iris, { scale: [0.058, 0.078, 0.03], line: false });
    const pupil = part(open, small, m.pupil, {
      at: [0, 0, 0.016],
      scale: [0.03, 0.058, 0.02],
      line: false,
    });
    part(open, small, m.shine, {
      at: [0.018, 0.028, 0.027],
      scale: [0.019, 0.019, 0.01],
      line: false,
    });
    part(open, small, m.shine, {
      at: [-0.016, -0.026, 0.026],
      scale: [0.009, 0.009, 0.006],
      line: false,
    });
    const happy = part(g, arc, m.ink, { at: [0, -0.015, 0.02], line: false });
    const closed = part(g, arc, m.ink, {
      at: [0, 0.015, 0.02],
      turn: [0, 0, Math.PI],
      line: false,
    });
    return { open, pupil, happy, closed, side };
  };

  for (const s of SIDES) {
    part(head, small, m.belly, {
      at: [s * 0.058, -0.1, 0.325],
      scale: [0.078, 0.06, 0.058],
      zone: 'nose',
    });
  }
  part(head, small, m.nose, {
    at: [0, -0.06, 0.378],
    scale: [0.034, 0.022, 0.022],
    line: false,
    zone: 'nose',
  });
  const mouth = part(head, small, m.mouth, {
    at: [0, -0.158, 0.335],
    scale: [0.03, 0.01, 0.02],
    line: false,
  });
  mouth.visible = false;

  for (const s of SIDES) {
    part(head, disc, m.blush, {
      at: [s * 0.255, -0.06, 0.31],
      turn: [-0.18, s * 0.53, 0],
      scale: [0.055, 0.055, 1],
      line: false,
    });
    for (const k of SIDES) {
      part(head, whisker, m.ink, {
        at: [s * 0.27, -0.1 + k * 0.025, 0.3],
        turn: [0, s * 0.35, Math.PI / 2 + s * k * 0.14],
        line: false,
      });
    }
  }

  // Tabby marks on the forehead, for the coats that have them.
  const stripes = new Group();
  head.add(stripes);
  const marks = [
    [-0.075, 0.215, 0.29, 0.25],
    [0, 0.235, 0.282, 0],
    [0.075, 0.215, 0.29, -0.25],
  ] as const;
  for (const [x, y, z, r] of marks) {
    part(stripes, stripe, m.stripe, {
      at: [x, y, z],
      turn: [-0.62, 0, r],
      line: false,
    });
  }

  return {
    ears: [makeEar(-1), makeEar(1)],
    eyes: [makeEye(-1), makeEye(1)],
    mouth,
    stripes,
  };
}

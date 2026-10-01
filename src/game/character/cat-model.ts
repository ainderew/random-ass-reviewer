import {
  CapsuleGeometry,
  CatmullRomCurve3,
  Group,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Mesh,
} from 'three';
import { COATS, catMaterials, paintCoat, type CoatName } from './cat-coats';
import { buildFace, type CatFace } from './cat-face';
import { partMaker } from './cat-parts';
import { lathe } from './toon';

export type { CatZone } from './cat-parts';
export type { CoatName } from './cat-coats';

// The study cat, built from spheres, two lathes and a tube. No model file:
// every part is a named object the behaviour can move, swap, or squash.
export interface CatRig extends CatFace {
  root: Group;
  torso: Group;
  headPivot: Group;
  head: Group;
  paws: [Mesh, Mesh];
  arms: [Mesh, Mesh];
  hind: [Mesh, Mesh];
  tail: Mesh;
  tailTip: Mesh;
  pickables: Mesh[];
  coat: (name: CoatName) => void;
}

const sphere = new SphereGeometry(1, 48, 32);
const small = new SphereGeometry(1, 20, 14);
const arm = new CapsuleGeometry(0.062, 0.25, 6, 14);
// A seated pear, turned on a lathe.
const body = lathe([
  [0, 0],
  [0.3, 0.015],
  [0.44, 0.1],
  [0.47, 0.24],
  [0.42, 0.4],
  [0.3, 0.53],
  [0.14, 0.6],
  [0, 0.62],
]);
const PAW_SCALE = [0.1, 0.07, 0.12] as const;

export function buildCat(): CatRig {
  const m = catMaterials();
  const pickables: Mesh[] = [];
  const part = partMaker(pickables);

  const root = new Group();
  const torso = new Group();
  root.add(torso);
  part(torso, body, m.coat, { scale: [1, 1, 0.88], zone: 'back' });
  part(torso, sphere, m.belly, {
    at: [0, 0.27, 0.315],
    scale: [0.25, 0.24, 0.1],
    line: false,
    zone: 'back',
  });

  const arms: [Mesh, Mesh] = [
    part(root, arm, m.coat, { zone: 'paw' }),
    part(root, arm, m.coat, { zone: 'paw' }),
  ];
  const paws: [Mesh, Mesh] = [
    part(root, small, m.belly, {
      at: [-0.13, 0.04, 0.37],
      scale: PAW_SCALE,
      zone: 'paw',
    }),
    part(root, small, m.belly, {
      at: [0.13, 0.04, 0.37],
      scale: PAW_SCALE,
      zone: 'paw',
    }),
  ];
  const foot = (s: number) =>
    part(root, small, m.belly, {
      at: [s * 0.33, 0.035, 0.2],
      scale: [0.11, 0.065, 0.14],
      zone: 'paw',
    });
  const hind: [Mesh, Mesh] = [foot(-1), foot(1)];
  // A stub until the first frame bends the real tail.
  const stub = new TubeGeometry(
    new CatmullRomCurve3([new Vector3(), new Vector3(0, 0.1, 0)]),
    4,
    0.058,
    8,
  );
  const tail = part(root, stub, m.coat, { zone: 'tail' });
  const tailTip = part(root, small, m.coat, {
    scale: [0.058, 0.058, 0.058],
    zone: 'tail',
  });

  // The head swings from a neck pivot so nods and turns start at the shoulders.
  const headPivot = new Group();
  headPivot.position.set(0, 0.56, 0.03);
  root.add(headPivot);
  const head = new Group();
  head.position.set(0, 0.2, 0);
  headPivot.add(head);
  part(head, sphere, m.coat, { scale: [0.44, 0.37, 0.37], zone: 'head' });
  const face = buildFace(head, m, part);

  const coat = (name: CoatName) => {
    paintCoat(m, name);
    face.stripes.visible = COATS[name].stripes !== null;
    for (const eye of face.eyes) eye.pupil.visible = COATS[name].pupil;
  };
  coat('ginger');

  return {
    ...face,
    root,
    torso,
    headPivot,
    head,
    paws,
    arms,
    hind,
    tail,
    tailTip,
    pickables,
    coat,
  };
}

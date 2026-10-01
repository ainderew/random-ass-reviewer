import {
  CapsuleGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  DoubleSide,
} from 'three';
import { outlined, roundedBox, toon, toonMaterial } from './toon';

// The things care brings out: a bowl of kibble, a tuna flake, a soft brush,
// and three toys. All hidden until their moment, all in her own space so they
// sit on her cushion whatever size the scene is drawn at.

export type ToyKind = 'wand' | 'mouse' | 'yarn';

export interface CareProps {
  group: Group;
  bowl: Group;
  kibble: Group;
  treat: Mesh;
  brush: Group;
  toys: Record<ToyKind, Group>;
  wandString: Mesh;
  yarnBall: Group;
}

const small = new SphereGeometry(1, 20, 14);
const at = (m: Mesh | Group, x: number, y: number, z: number) => {
  m.position.set(x, y, z);
  return m;
};
const mesh = (geometry: Mesh['geometry'], color: string, line = true) => {
  const m = new Mesh(geometry, toon(color));
  return line ? outlined(m) : m;
};
const blob = (
  color: string,
  sx: number,
  sy: number,
  sz: number,
  line = true,
) => {
  const m = mesh(small, color, line);
  m.scale.set(sx, sy, sz);
  return m;
};

function buildBowl(): { bowl: Group; kibble: Group } {
  const bowl = new Group();
  const profile = [
    [0, 0],
    [0.1, 0],
    [0.13, 0.015],
    [0.15, 0.06],
    [0.155, 0.085],
    [0.14, 0.088],
    [0.125, 0.055],
    [0, 0.045],
  ];
  const lathe = new LatheGeometry(
    profile.map(([x, y]) => new Vector2(x, y)),
    40,
  );
  bowl.add(outlined(new Mesh(lathe, toonMaterial('#b7a2d8', DoubleSide))));
  const kibble = new Group();
  kibble.position.y = 0.065;
  const bits = [
    [0, 0, 0.02],
    [0.05, 0.02, 0],
    [-0.05, 0.015, 0],
    [0.02, -0.05, 0],
    [-0.03, -0.045, 0],
    [0.05, -0.03, 0.01],
    [-0.015, 0.05, 0.01],
    [0, 0, 0.035],
  ];
  bits.forEach(([x, z, y], i) =>
    kibble.add(
      at(
        blob(i % 2 ? '#c98a5c' : '#b97a4f', 0.03, 0.022, 0.03, false),
        x!,
        y!,
        z!,
      ),
    ),
  );
  bowl.add(kibble);
  return { bowl, kibble };
}

function buildBrush(): Group {
  const brush = new Group();
  brush.add(mesh(roundedBox(0.22, 0.055, 0.11, 0.025), '#b7a2d8'));
  brush.add(
    at(
      mesh(roundedBox(0.19, 0.03, 0.085, 0.012), '#fff8f1', false),
      0,
      -0.04,
      0,
    ),
  );
  const handle = at(
    mesh(new CapsuleGeometry(0.024, 0.16, 4, 10), '#f5c08c'),
    0.2,
    0.01,
    0,
  );
  handle.rotation.z = Math.PI / 2;
  brush.add(handle);
  return brush;
}

function buildWand(): Group {
  const g = new Group();
  g.add(blob('#f5c08c', 0.028, 0.028, 0.028));
  for (const s of [-1, 1]) {
    const plume = at(blob('#e9a3c1', 0.035, 0.1, 0.02), s * 0.032, -0.09, 0);
    plume.rotation.z = s * 0.3;
    g.add(plume);
  }
  g.add(at(blob('#d988ad', 0.03, 0.11, 0.02), 0, -0.11, 0.006));
  return g;
}

function buildMouse(): Group {
  const g = new Group();
  g.add(blob('#b3aec2', 0.1, 0.06, 0.066));
  g.add(at(blob('#ec8a93', 0.016, 0.016, 0.016, false), 0.1, 0, 0));
  for (const s of [-1, 1]) {
    g.add(at(blob('#efb2b8', 0.026, 0.028, 0.008), 0.045, 0.05, s * 0.035));
    const eye = new Mesh(small, new MeshBasicMaterial({ color: '#2e2233' }));
    eye.scale.setScalar(0.009);
    g.add(at(eye, 0.078, 0.022, s * 0.028));
  }
  const curve = new CatmullRomCurve3([
    new Vector3(-0.09, 0, 0),
    new Vector3(-0.16, 0.025, 0.02),
    new Vector3(-0.21, 0, -0.02),
    new Vector3(-0.25, 0.03, 0),
  ]);
  g.add(mesh(new TubeGeometry(curve, 12, 0.008, 6), '#efb2b8', false));
  return g;
}

function buildYarn(): { group: Group; ball: Group } {
  const group = new Group();
  const ball = new Group();
  ball.add(blob('#8cc79b', 0.09, 0.09, 0.09));
  for (const [x, y, z] of [
    [0.4, 0, 0],
    [1.2, 0.6, 0],
    [0, 1, 0.8],
  ]) {
    const wrap = mesh(new TorusGeometry(0.088, 0.007, 6, 32), '#79b98b', false);
    wrap.rotation.set(x!, y!, z!);
    ball.add(wrap);
  }
  group.add(ball);
  return { group, ball };
}

export function buildCareProps(): CareProps {
  const group = new Group();
  const { bowl, kibble } = buildBowl();
  // On the front lip of her cushion, between her paws.
  bowl.position.set(0, 0.02, 0.6);
  const treat = mesh(roundedBox(0.1, 0.045, 0.065, 0.02), '#f3a68e');
  const brush = buildBrush();
  const yarn = buildYarn();
  const toys: Record<ToyKind, Group> = {
    wand: buildWand(),
    mouse: buildMouse(),
    yarn: yarn.group,
  };
  const wandString = new Mesh(
    new CylinderGeometry(0.004, 0.004, 1, 5),
    new MeshBasicMaterial({ color: '#38273d' }),
  );
  for (const piece of [
    bowl,
    treat,
    brush,
    wandString,
    ...Object.values(toys),
  ]) {
    piece.visible = false;
    group.add(piece);
  }
  return {
    group,
    bowl,
    kibble,
    treat,
    brush,
    toys,
    wandString,
    yarnBall: yarn.ball,
  };
}

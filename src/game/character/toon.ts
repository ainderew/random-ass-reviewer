import {
  BackSide,
  BoxGeometry,
  Color,
  DataTexture,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  ShaderMaterial,
  SplineCurve,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Side,
} from 'three';
import { CLAY } from './look';

// The study scene's look: flat bands of colour from a three-step ramp and an
// ink outline in the plum of the stationery, so the cat and her room read as
// one rounded cartoon.
const ramp = new DataTexture(new Uint8Array([120, 190, 255]), 3, 1, RedFormat);
ramp.minFilter = NearestFilter;
ramp.magFilter = NearestFilter;
ramp.needsUpdate = true;

export type SurfaceMaterial = MeshToonMaterial | MeshPhysicalMaterial;

// Clay: matte, with a soft sheen that lifts the edges the way felt or fur
// catches light, so rounded parts read as solid without an outline.
// True-colour light shows the room's paints at full strength, so clay softens
// them a touch to keep the room calm. The cat's coat is painted afterwards,
// richer, so she stays the warmest thing in it.
function clayMaterial(color: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(color).offsetHSL(0, -0.12, 0.025),
    roughness: 0.8,
    metalness: 0,
    sheen: 0.4,
    sheenRoughness: 0.55,
    sheenColor: new Color('#ffe2cf'),
  });
}

export function toonMaterial(color: string, side?: Side): SurfaceMaterial {
  const material = CLAY
    ? clayMaterial(color)
    : new MeshToonMaterial({ color, gradientMap: ramp });
  if (side !== undefined) material.side = side;
  return material;
}

// Room props share one material per colour. The cat makes her own, because
// her coat changes.
const shared = new Map<string, SurfaceMaterial>();
export function toon(color: string): SurfaceMaterial {
  let material = shared.get(color);
  if (!material) {
    material = toonMaterial(color);
    shared.set(color, material);
  }
  return material;
}

// Inverted hull pushed out along view-space normals, so the line keeps one
// weight on squashed spheres and on a scaled cat.
export const OUTLINE = new ShaderMaterial({
  uniforms: {
    color: { value: new Color('#38273d') },
    thickness: { value: 0.017 },
  },
  vertexShader: /* glsl */ `
    uniform float thickness;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      mv.xyz += n * thickness;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    void main() {
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
    }`,
  side: BackSide,
});
// Clay draws form with light instead of a line.
OUTLINE.visible = !CLAY;

// Adds the ink line as a child that shares the geometry and never takes a tap.
export function outlined<T extends Mesh>(mesh: T): T {
  const line = new Mesh(mesh.geometry, OUTLINE);
  line.raycast = () => {};
  mesh.add(line);
  mesh.userData.outline = line;
  return mesh;
}

// A box whose edges are pushed out to a radius, with normals from the same
// push so the toon bands curve smoothly round the corners.
export function roundedBox(
  w: number,
  h: number,
  d: number,
  r = Math.min(w, h, d) * 0.3,
  segments = 4,
): BufferGeometry {
  const geometry = new BoxGeometry(w, h, d, segments, segments, segments);
  const position = geometry.attributes.position!;
  const normal = geometry.attributes.normal!;
  const inner = new Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
  const negative = inner.clone().negate();
  const v = new Vector3();
  const core = new Vector3();
  const out = new Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    core.copy(v).clamp(negative, inner);
    out.subVectors(v, core);
    if (out.lengthSq() === 0) continue;
    out.normalize();
    v.copy(core).addScaledVector(out, r);
    position.setXYZ(i, v.x, v.y, v.z);
    normal.setXYZ(i, out.x, out.y, out.z);
  }
  return geometry;
}

// A solid of revolution through a smooth curve: the cat's body and ears.
export function lathe(
  points: readonly (readonly [number, number])[],
  segments = 48,
  samples = 36,
): LatheGeometry {
  const curve = new SplineCurve(points.map(([x, y]) => new Vector2(x, y)));
  return new LatheGeometry(curve.getPoints(samples), segments);
}

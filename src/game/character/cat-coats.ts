import {
  DataTexture,
  LinearFilter,
  MeshBasicMaterial,
  MeshToonMaterial,
  RedFormat,
} from 'three';
import type { SurfaceMaterial } from './toon';

// A soft painted ramp, independent of the room's clay materials.
const ramp = new DataTexture(
  new Uint8Array([155, 195, 226, 255]),
  4,
  1,
  RedFormat,
);
ramp.minFilter = LinearFilter;
ramp.magFilter = LinearFilter;
ramp.needsUpdate = true;
const painted = (color: string) =>
  new MeshToonMaterial({ color, gradientMap: ramp });

// Her coats. Ginger for now; the others are ready for when she can be chosen.
// A dark coat draws her closed eyes and whiskers in a light line.
export const COATS = {
  ginger: {
    coat: '#b89a80',
    belly: '#fff0d9',
    ear: '#f6b3a5',
    stripes: '#796250',
    eye: '#382319',
    pupil: false,
    line: '#382319',
  },
  cream: {
    coat: '#fbf1e4',
    belly: '#ffffff',
    ear: '#f5b2ab',
    stripes: null,
    eye: '#382319',
    pupil: false,
    line: '#382319',
  },
  tuxedo: {
    coat: '#3d3444',
    belly: '#f7f1ea',
    ear: '#d98f9c',
    stripes: null,
    eye: '#f3c552',
    pupil: true,
    line: '#f7ece2',
  },
  grey: {
    coat: '#b3aec2',
    belly: '#f3f0f6',
    ear: '#efb2b8',
    stripes: '#8a84a0',
    eye: '#382319',
    pupil: false,
    line: '#382319',
  },
} as const;
export type CoatName = keyof typeof COATS;

export interface CatMaterials {
  coat: SurfaceMaterial;
  belly: SurfaceMaterial;
  earIn: SurfaceMaterial;
  stripe: SurfaceMaterial;
  nose: SurfaceMaterial;
  iris: MeshBasicMaterial;
  ink: MeshBasicMaterial;
  pupil: MeshBasicMaterial;
  shine: MeshBasicMaterial;
  mouth: MeshBasicMaterial;
  blush: MeshBasicMaterial;
}

// Her own materials, not the room's shared ones, so a coat change touches
// only her.
export function catMaterials(): CatMaterials {
  const c = COATS.ginger;
  return {
    coat: painted(c.coat),
    belly: painted(c.belly),
    earIn: painted(c.ear),
    stripe: painted(c.stripes),
    nose: painted('#efa18b'),
    iris: new MeshBasicMaterial({ color: c.eye }),
    ink: new MeshBasicMaterial({ color: c.line }),
    pupil: new MeshBasicMaterial({ color: '#1f1824' }),
    shine: new MeshBasicMaterial({ color: '#ffffff' }),
    mouth: new MeshBasicMaterial({ color: '#9b4150' }),
    blush: new MeshBasicMaterial({
      color: '#e8a18d',
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  };
}

export function paintCoat(m: CatMaterials, name: CoatName): void {
  const c = COATS[name];
  m.coat.color.set(c.coat);
  m.belly.color.set(c.belly);
  m.earIn.color.set(c.ear);
  m.iris.color.set(c.eye);
  m.ink.color.set(c.line);
  if (c.stripes) m.stripe.color.set(c.stripes);
}

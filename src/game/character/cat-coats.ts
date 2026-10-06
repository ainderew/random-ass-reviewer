import { MeshBasicMaterial, type Color } from 'three';
import { CLAY } from './look';
import { toonMaterial, type SurfaceMaterial } from './toon';

// Her coats. Ginger for now; the others are ready for when she can be chosen.
// A dark coat draws her closed eyes and whiskers in a light line.
export const COATS = {
  ginger: {
    coat: '#f2a766',
    belly: '#fff3e6',
    ear: '#f6b3a5',
    stripes: '#d77f3c',
    eye: '#2e2233',
    pupil: false,
    line: '#2e2233',
  },
  cream: {
    coat: '#fbf1e4',
    belly: '#ffffff',
    ear: '#f5b2ab',
    stripes: null,
    eye: '#2e2233',
    pupil: false,
    line: '#2e2233',
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
    eye: '#2e2233',
    pupil: false,
    line: '#2e2233',
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
    coat: toonMaterial(c.coat),
    belly: toonMaterial(c.belly),
    earIn: toonMaterial(c.ear),
    stripe: toonMaterial(c.stripes),
    nose: toonMaterial('#ec8a93'),
    iris: new MeshBasicMaterial({ color: c.eye }),
    ink: new MeshBasicMaterial({ color: c.line }),
    pupil: new MeshBasicMaterial({ color: '#1f1824' }),
    shine: new MeshBasicMaterial({ color: '#ffffff' }),
    mouth: new MeshBasicMaterial({ color: '#9b4150' }),
    blush: new MeshBasicMaterial({
      color: CLAY ? '#f2848f' : '#f2909a',
      transparent: true,
      opacity: CLAY ? 0.62 : 0.45,
      depthWrite: false,
    }),
  };
}

// Soft light on clay pales a colour, so clay coats start a little richer.
const richen = (color: Color) =>
  CLAY ? color.offsetHSL(0, 0.1, -0.035) : color;

export function paintCoat(m: CatMaterials, name: CoatName): void {
  const c = COATS[name];
  richen(m.coat.color.set(c.coat));
  m.belly.color.set(c.belly);
  richen(m.earIn.color.set(c.ear));
  m.iris.color.set(c.eye);
  m.ink.color.set(c.line);
  if (c.stripes) richen(m.stripe.color.set(c.stripes));
}

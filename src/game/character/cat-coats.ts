import { MeshBasicMaterial, type MeshToonMaterial } from 'three';
import { toonMaterial } from './toon';

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
  coat: MeshToonMaterial;
  belly: MeshToonMaterial;
  earIn: MeshToonMaterial;
  stripe: MeshToonMaterial;
  nose: MeshToonMaterial;
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
      color: '#f2909a',
      transparent: true,
      opacity: 0.45,
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

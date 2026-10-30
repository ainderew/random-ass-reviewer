import { Color, MeshBasicMaterial, MeshPhysicalMaterial } from 'three';
import type { SurfaceMaterial } from './toon';

// Soft fur catches the warm room light without a drawn silhouette.
const fur = (color: string) =>
  new MeshPhysicalMaterial({
    color,
    roughness: 0.82,
    metalness: 0,
    sheen: 0.65,
    sheenRoughness: 0.7,
    sheenColor: new Color('#ffe5c3'),
  });

// Her coats. Ginger for now; the others are ready for when she can be chosen.
// A dark coat draws her closed eyes and whiskers in a light line.
export const COATS = {
  ginger: {
    coat: '#ed8a32',
    belly: '#fff0d9',
    ear: '#f6b3a5',
    stripes: '#b95721',
    eye: '#a76826',
    pupil: true,
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
  iris: MeshPhysicalMaterial;
  frames: MeshPhysicalMaterial;
  sclera: MeshPhysicalMaterial;
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
    coat: fur(c.coat),
    belly: fur(c.belly),
    earIn: fur(c.ear),
    stripe: fur(c.stripes),
    nose: fur('#efa18b'),
    iris: new MeshPhysicalMaterial({
      color: c.eye,
      roughness: 0.2,
      clearcoat: 1,
    }),
    frames: new MeshPhysicalMaterial({
      color: '#382319',
      roughness: 0.28,
      clearcoat: 0.7,
    }),
    sclera: new MeshPhysicalMaterial({
      color: '#fff6e8',
      roughness: 0.22,
      clearcoat: 1,
    }),
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

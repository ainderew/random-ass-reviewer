import { Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { outlined } from './toon';

// Where a touch landed on her, as she would feel it.
export type CatZone =
  'head' | 'back' | 'chin' | 'nose' | 'paw' | 'ear' | 'tail';

type V3 = readonly [number, number, number];
export interface PartOptions {
  at?: V3;
  scale?: V3;
  turn?: V3;
  // Ink outline; on by default, off for small flat details.
  line?: boolean;
  // Parts with a zone can be touched.
  zone?: CatZone;
}
export type Part = (
  parent: Object3D,
  geometry: BufferGeometry,
  material: Material,
  options?: PartOptions,
) => Mesh;

// Makes parts and collects the touchable ones for the raycaster.
export function partMaker(pickables: Mesh[]): Part {
  return (parent, geometry, material, o = {}) => {
    const mesh = new Mesh(geometry, material);
    if (o.at) mesh.position.set(...o.at);
    if (o.scale) mesh.scale.set(...o.scale);
    if (o.turn) mesh.rotation.set(...o.turn);
    if (o.line ?? true) outlined(mesh);
    if (o.zone) {
      mesh.userData.zone = o.zone;
      pickables.push(mesh);
    }
    parent.add(mesh);
    return mesh;
  };
}

import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import {
  BufferAttribute,
  type BufferGeometry,
  Float32BufferAttribute,
  InterleavedBufferAttribute,
  type Material,
  type Mesh,
} from 'three';
import type { AssetId } from '@/domain/assets/manifest.generated';
import { assetUrl } from './asset-url';

export interface AssetPart {
  geometry: BufferGeometry;
  material: Material;
}

type AnyAttribute = BufferAttribute | InterleavedBufferAttribute;

// meshopt output is interleaved, normalised int16. Transforming that in place
// wraps anything past a unit (three normalises back into the int16 array), so
// every attribute we touch is widened to a plain float buffer first.
function toFloat(attribute: AnyAttribute): BufferAttribute {
  if (
    attribute instanceof BufferAttribute &&
    attribute.array instanceof Float32Array
  ) {
    return attribute;
  }
  const size = attribute.itemSize;
  const out = new Float32Array(attribute.count * size);
  for (let i = 0; i < attribute.count; i += 1) {
    out[i * size] = attribute.getX(i);
    if (size > 1) out[i * size + 1] = attribute.getY(i);
    if (size > 2) out[i * size + 2] = attribute.getZ(i);
    if (size > 3) out[i * size + 3] = attribute.getW(i);
  }
  return new Float32BufferAttribute(out, size);
}

// Manifest-typed loader. One part per glTF primitive, so a two-material prop
// becomes two instanced meshes with shared matrices. Node transforms are
// baked into the geometry: quantisation and real Tripo3D exports both carry
// scale and offset on the node, and instancing has no node.
export function useAsset(id: AssetId): AssetPart[] {
  const gltf = useGLTF(assetUrl(id), false, true);
  return useMemo(() => {
    const parts: AssetPart[] = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const material = Array.isArray(mesh.material)
        ? mesh.material[0]
        : mesh.material;
      if (!material) return;
      const geometry = mesh.geometry.clone();
      for (const name of ['position', 'normal']) {
        const attribute = geometry.getAttribute(name);
        if (
          attribute instanceof BufferAttribute ||
          attribute instanceof InterleavedBufferAttribute
        ) {
          geometry.setAttribute(name, toFloat(attribute));
        }
      }
      geometry.applyMatrix4(mesh.matrixWorld);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      parts.push({ geometry, material });
    });
    return parts;
  }, [gltf]);
}

export function preloadAsset(id: AssetId): void {
  useGLTF.preload(assetUrl(id), false, true);
}

import type { MeshStandardMaterial } from 'three';
import { unitHash } from '@/domain/world/hash';

export interface EmissiveEntry {
  material: MeshStandardMaterial;
  // 0..0.5: where in dusk this group lights up. Staggered by asset id.
  stagger: number;
}

// Materials named emissive_* register here when their asset loads. One entry
// per shared material, so variation is per group rather than per instance.
export const emissiveEntries = new Map<MeshStandardMaterial, EmissiveEntry>();

export function isEmissiveMaterial(material: { name?: string }): boolean {
  return (
    typeof material.name === 'string' && material.name.startsWith('emissive')
  );
}

export function registerEmissive(
  material: MeshStandardMaterial,
  assetId: string,
): void {
  if (emissiveEntries.has(material)) return;
  material.emissiveIntensity = 0;
  emissiveEntries.set(material, { material, stagger: unitHash(assetId) * 0.5 });
}

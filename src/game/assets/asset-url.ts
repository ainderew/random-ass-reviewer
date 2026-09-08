import {
  ASSET_MANIFEST,
  type AssetId,
} from '@/domain/assets/manifest.generated';

// NEXT_PUBLIC_ vars are inlined at build time only when referenced literally.
const BASE = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '';

export function assetUrl(id: AssetId): string {
  return `${BASE}${ASSET_MANIFEST[id].url}`;
}

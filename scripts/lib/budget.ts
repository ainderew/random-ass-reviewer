import { MAX_ASSET_BYTES, MAX_ASSET_TRIANGLES } from '@/domain/assets/types';

export class AssetBudgetError extends Error {
  constructor(id: string, detail: string) {
    super(`Asset "${id}" is over budget: ${detail}`);
    this.name = 'AssetBudgetError';
  }
}

// A budget that is not enforced is a budget that is already blown.
export function assertWithinBudget(
  id: string,
  stats: { bytes: number; triangles: number },
): void {
  if (stats.bytes > MAX_ASSET_BYTES) {
    throw new AssetBudgetError(
      id,
      `${(stats.bytes / 1024).toFixed(1)} KB, limit ${MAX_ASSET_BYTES / 1024} KB`,
    );
  }
  if (stats.triangles > MAX_ASSET_TRIANGLES) {
    throw new AssetBudgetError(
      id,
      `${stats.triangles} triangles, limit ${MAX_ASSET_TRIANGLES}`,
    );
  }
}

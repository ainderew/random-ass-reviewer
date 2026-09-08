import { ASSET_MANIFEST, isAssetId } from '@/domain/assets/manifest.generated';
import type { Placement } from '@/domain/types';

// WebGL is unavailable. The island is still theirs; list it plainly.
export const IslandFallback = ({ placements }: { placements: Placement[] }) => {
  const counts = new Map<string, number>();
  for (const p of placements) {
    const label = isAssetId(p.assetId)
      ? ASSET_MANIFEST[p.assetId].label
      : p.assetId;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return (
    <section className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-ink">Your island</h1>
        <p className="leading-relaxed text-ink-2">
          This browser cannot draw 3D, so here is the island as a list. Study
          and review work exactly the same.
        </p>
      </div>
      {counts.size === 0 ? (
        <p className="text-ink-2">
          Nothing built yet. Study to earn Focus, then come back.
        </p>
      ) : (
        <ul className="divide-y divide-hairline">
          {[...counts.entries()].map(([label, count]) => (
            <li key={label} className="flex items-center justify-between py-3">
              <span className="text-ink">{label}</span>
              <span className="font-mono text-sm text-ink-2 tabular-nums">
                ×{count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

// Shown while the three.js chunk downloads. Asset progress takes over once
// the canvas mounts.
export const IslandSkeleton = () => (
  <div
    role="status"
    aria-live="polite"
    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ground-2"
  >
    <div className="size-24 rounded-full bg-ground-3" aria-hidden="true" />
    <p className="text-sm text-ink-2">Loading your island…</p>
  </div>
);

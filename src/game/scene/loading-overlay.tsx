import { useProgress } from '@react-three/drei';

// Real asset progress from the three.js loading manager. Sits over the canvas
// until every GLB is in; a blank canvas reads as broken.
export const LoadingOverlay = () => {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;
  const pct = Math.round(progress);
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ground/80"
    >
      <p className="text-sm text-ink-2">Loading your island · {pct}%</p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-ground-3">
        <div
          className="h-full bg-focus transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

import { IslandSkeleton } from '@/components/island/island-skeleton';

// Covers the server fetch only. Asset progress takes over once the canvas mounts.
export default function IslandLoading() {
  return (
    <div className="relative min-h-[60dvh] flex-1">
      <IslandSkeleton />
    </div>
  );
}

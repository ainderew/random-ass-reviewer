import { Skeleton, SkeletonPage } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <SkeletonPage label="Loading settings">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-11 w-full" />
    </SkeletonPage>
  );
}

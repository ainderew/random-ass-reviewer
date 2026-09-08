import { Skeleton, SkeletonPage } from '@/components/ui/skeleton';

export default function ReviewLoading() {
  return (
    <SkeletonPage label="Loading your deck">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="min-h-64 w-full" />
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-3 gap-4 pt-6">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </SkeletonPage>
  );
}

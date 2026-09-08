import { Skeleton, SkeletonPage } from '@/components/ui/skeleton';

export default function StudyLoading() {
  return (
    <SkeletonPage label="Loading the timer">
      <div className="mx-auto w-full max-w-md space-y-8 pt-8">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11 w-3/4" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-14 w-full" />
      </div>
    </SkeletonPage>
  );
}

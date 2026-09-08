import { Skeleton, SkeletonPage } from '@/components/ui/skeleton';

export default function NoteLoading() {
  return (
    <SkeletonPage label="Loading these notes">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-14 w-full" />
      <div className="space-y-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    </SkeletonPage>
  );
}

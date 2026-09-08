import { Skeleton, SkeletonPage } from '@/components/ui/skeleton';

export default function NotesLoading() {
  return (
    <SkeletonPage label="Loading your notes">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-72 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </SkeletonPage>
  );
}

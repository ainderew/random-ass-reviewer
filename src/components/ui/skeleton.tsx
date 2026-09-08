// Shape-matched placeholders. The pulse is CSS; reduced motion stills it.
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-md bg-ground-3 ${className}`}
  />
);

export const SkeletonPage = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div
    role="status"
    aria-label={label}
    aria-busy="true"
    className="mx-auto w-full max-w-2xl space-y-6"
  >
    <span className="sr-only">Loading</span>
    {children}
  </div>
);

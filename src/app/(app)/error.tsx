'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

// Shell-level fallback. Route segments catch their own failures first; this
// only fires for something the segment did not handle.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app]', error);
  }, [error]);
  return (
    <ErrorState
      title="Something went wrong"
      body="Your progress is saved on the server. Try again, or head back to study."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

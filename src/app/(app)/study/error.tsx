'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[study]', error);
  }, [error]);
  return (
    <ErrorState
      title="The timer did not load"
      body="Any session in flight is still counting on the server. Try again."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

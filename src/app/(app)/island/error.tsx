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
    console.error('[island]', error);
  }, [error]);
  return (
    <ErrorState
      title="The island did not load"
      body="Your progress is safe on the server. Study and review still work."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

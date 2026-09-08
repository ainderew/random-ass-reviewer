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
    console.error('[review]', error);
  }, [error]);
  return (
    <ErrorState
      title="The review queue did not load"
      body="Nothing was lost. Try again in a moment."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

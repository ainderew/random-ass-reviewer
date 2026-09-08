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
    console.error('[note]', error);
  }, [error]);
  return (
    <ErrorState
      title="These notes did not load"
      body="The cards are still there. Try again, or go back to your notes."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

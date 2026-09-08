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
    console.error('[notes]', error);
  }, [error]);
  return (
    <ErrorState
      title="Your notes did not load"
      body="They are still there. Try again in a moment."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

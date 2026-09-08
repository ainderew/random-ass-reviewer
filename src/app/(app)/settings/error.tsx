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
    console.error('[settings]', error);
  }, [error]);
  return (
    <ErrorState
      title="Settings did not load"
      body="Nothing has changed. Try again in a moment."
      digest={error.digest}
      onRetry={reset}
    />
  );
}

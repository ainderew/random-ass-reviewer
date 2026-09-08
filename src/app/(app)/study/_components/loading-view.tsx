import { TimerFrame } from './timer-frame';

// Skeleton, not a spinner. The shapes match the idle screen so nothing jumps.
export const LoadingView = () => (
  <TimerFrame label="Checking for a session">
    <div className="space-y-4" aria-hidden="true">
      <div className="h-10 w-3/4 rounded-md bg-ground-3" />
      <div className="h-5 w-1/2 rounded-md bg-ground-2" />
    </div>
    <p className="sr-only" role="status">
      Checking for a session
    </p>
  </TimerFrame>
);

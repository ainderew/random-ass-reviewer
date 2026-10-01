'use client';

import { Button } from '@/components/ui/button';
import { useNudges } from '../_hooks/use-nudges';

// The cat's push nudges on this device: at most one a day, in waking hours,
// when she has gone 18 hours without you. Shown only where they can work.
export const NudgeToggle = ({ name }: { name: string }) => {
  const nudges = useNudges();
  if (!nudges.available) return null;

  if (nudges.where === 'install-first') {
    return (
      <p className="text-sm text-ink-2">
        To let {name} nudge you when she misses you, add Aloft to your Home
        Screen first, then open it from there.
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t border-hairline pt-4">
      <div>
        <p className="font-medium text-ink">
          {nudges.onHere
            ? `${name} can nudge you here`
            : `Let ${name} nudge you`}
        </p>
        <p className="text-sm text-ink-2">
          One notification at most a day, when she has gone 18 hours without
          you.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {nudges.onHere ? (
          <>
            <Button
              variant="ghost"
              onClick={nudges.test}
              disabled={nudges.busy}
            >
              Send a test
            </Button>
            <Button
              variant="ghost"
              onClick={nudges.turnOff}
              disabled={nudges.busy}
            >
              Turn off
            </Button>
          </>
        ) : (
          <Button
            onClick={nudges.turnOn}
            disabled={nudges.busy}
            aria-busy={nudges.busy}
          >
            Turn on nudges
          </Button>
        )}
      </div>
      {nudges.message ? (
        <p role="status" className="text-sm text-ink-2">
          {nudges.message}
        </p>
      ) : null}
    </div>
  );
};

import type { CareerProgress } from '@/domain/career/milestones';
import type { SessionLength } from '@/domain/session/rungs';
import type { PetView } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { formatClock } from '@/lib/format-time';
import { catLook } from './cat-look';
import { FocusCircle } from './focus-circle';
import { LengthPicker } from './length-picker';
import { SoundControl } from './sound-control';

// The Focus tab before a session: the cat, how long, and one button, with
// the background sound beside it. The same session covers reading the notes
// in another app: time counts until End, on screen or not.
export const FocusIdle = ({
  career,
  pet,
  length,
  onLengthChange,
  starting,
  error,
  onStart,
}: {
  career: CareerProgress;
  pet: PetView | undefined;
  length: SessionLength;
  onLengthChange: (length: SessionLength) => void;
  starting: boolean;
  error: string | null;
  onStart: () => void;
}) => (
  <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 text-center">
    <FocusCircle
      progress={career}
      mood="wandering"
      lengthMs={length === null ? null : length * 60_000}
      {...(pet ? { name: pet.name, look: catLook(pet) } : {})}
    />
    {error ? (
      <p role="alert" className="text-warn">
        {error}
      </p>
    ) : null}
    <p
      className="font-mono text-[clamp(3.25rem,16vw,4.5rem)] leading-none font-medium tracking-[-0.03em] tabular-nums"
      aria-label="Session length"
    >
      {length === null ? 'Open' : formatClock(length * 60_000)}
    </p>
    <LengthPicker value={length} onChange={onLengthChange} />
    <div className="flex w-full gap-2">
      <Button
        onClick={onStart}
        disabled={starting}
        aria-busy={starting}
        size="lg"
        className="flex-1"
      >
        {starting ? 'Starting…' : 'Start focusing'}
      </Button>
      <SoundControl live={false} />
    </div>
  </div>
);

import type { CareerProgress } from '@/domain/career/milestones';
import { STUDY_BUDGETS, type StudyBudget } from '@/domain/review/today';
import type { SessionLength } from '@/domain/session/rungs';
import type { PetView } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { formatClock } from '@/lib/format-time';
import { catLook } from './cat-look';
import { FocusCircle } from './focus-circle';
import { LengthPicker } from './length-picker';

// The Focus tab before a session: the cat, how long, and one button. A
// reading block is one tap underneath for days spent with the notes.
export const FocusIdle = ({
  career,
  pet,
  length,
  onLengthChange,
  starting,
  error,
  onStart,
  onRead,
}: {
  career: CareerProgress;
  pet: PetView | undefined;
  length: SessionLength;
  onLengthChange: (length: SessionLength) => void;
  starting: boolean;
  error: string | null;
  onStart: () => void;
  onRead: (minutes: StudyBudget) => void;
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
    <Button
      onClick={onStart}
      disabled={starting}
      aria-busy={starting}
      size="lg"
      block
    >
      {starting ? 'Starting…' : 'Start focusing'}
    </Button>
    <div
      role="group"
      aria-label="Reading block"
      className="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-2"
    >
      <span>Or read your notes:</span>
      {STUDY_BUDGETS.map((minutes) => (
        <button
          key={minutes}
          type="button"
          disabled={starting}
          onClick={() => onRead(minutes)}
          aria-label={`Read for ${minutes} minutes`}
          className="min-h-11 rounded-full border border-hairline px-3.5 text-ink hover:bg-ground-2 disabled:opacity-50"
        >
          {minutes} min
        </button>
      ))}
    </div>
  </div>
);

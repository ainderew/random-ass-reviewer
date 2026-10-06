import { CheckIcon, PlusIcon } from '@/components/icons';

type Counts = { due: number; approved: number };

// One state per notebook, read at a glance: work waiting, nothing waiting, or
// nothing to study yet.
export function statusOf({ due, approved }: Counts) {
  if (approved === 0) return { state: 'empty' as const };
  return due > 0 ? { state: 'due' as const } : { state: 'done' as const };
}

export const CoverStatus = (counts: Counts) => {
  const { state } = statusOf(counts);
  return (
    <span className="cover-status" data-state={state}>
      {state === 'due' && (
        <>
          <strong>{counts.due}</strong> to review
        </>
      )}
      {state === 'done' && (
        <>
          <CheckIcon size={16} strokeWidth={2.25} /> All done for now
        </>
      )}
      {state === 'empty' && (
        <>
          <PlusIcon size={16} strokeWidth={2.25} /> Add notes
        </>
      )}
    </span>
  );
};

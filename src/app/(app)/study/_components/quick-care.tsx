'use client';

import type { CareRequest, PetView } from '@/domain/types';
import { PetIcon, type PetItem } from './pet-icons';

// Four taps of care under the cat: food, a treat, the brush, a toy. The full
// tray, with every toy and what unlocks it, is in her sheet.
interface Quick {
  item: PetItem;
  label: string;
  request: CareRequest | null;
  count: number | null;
}

function quickItems(pet: PetView): Quick[] {
  const toy = pet.toys.find((t) => t.id !== 'brush' && t.unlocked);
  const brush = pet.toys.find((t) => t.id === 'brush');
  return [
    {
      item: 'kibble',
      label: 'Feed',
      request: pet.kibble.bowls > 0 ? { action: 'feed' } : null,
      count: pet.kibble.bowls,
    },
    {
      item: 'treat',
      label: 'Treat',
      request: pet.treats > 0 ? { action: 'treat' } : null,
      count: pet.treats,
    },
    {
      item: 'brush',
      label: 'Brush',
      request: brush?.unlocked ? { action: 'brush' } : null,
      count: null,
    },
    {
      item: toy ? (toy.id as PetItem) : 'wand',
      label: 'Play',
      request:
        toy && toy.id !== 'brush' ? { action: 'play', toy: toy.id } : null,
      count: null,
    },
  ];
}

export const QuickCare = ({
  pet,
  busy,
  onCare,
}: {
  pet: PetView;
  busy: boolean;
  onCare: (request: CareRequest) => void;
}) => (
  <ul aria-label={`Care for ${pet.name}`} className="grid grid-cols-4 gap-2">
    {quickItems(pet).map((q) => {
      const ready = q.request !== null;
      const left = q.count === null ? '' : `, ${q.count} left`;
      return (
        <li key={q.label}>
          <button
            type="button"
            aria-disabled={!ready || busy}
            aria-label={`${q.label} ${pet.name}${ready ? left : q.count === 0 ? ', none left' : ', locked'}`}
            onClick={() => q.request && !busy && onCare(q.request)}
            className="flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-[14px] border border-hairline bg-ground-2 px-1 py-1.5 text-xs text-ink-2 transition-transform duration-150 active:scale-[0.97] aria-disabled:bg-ground-3 aria-disabled:active:scale-100"
          >
            <span
              className={`scale-75 ${ready ? '' : 'opacity-40 grayscale-[0.6]'}`}
            >
              <PetIcon item={q.item} />
            </span>
            <span className="-mt-1.5">
              {q.label}
              {q.count !== null ? (
                <span className="ml-1 font-mono text-ink tabular-nums">
                  {q.count}
                </span>
              ) : null}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

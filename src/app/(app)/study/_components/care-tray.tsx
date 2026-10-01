'use client';

import type { CareRequest, PetView } from '@/domain/types';
import { PetIcon, type PetItem } from './pet-icons';

interface TrayItem {
  item: PetItem;
  label: string;
  request: CareRequest;
  // What the button says under its name.
  detail: (pet: PetView) => { text: string; ready: boolean };
}

const toy = (pet: PetView, id: string) => pet.toys.find((t) => t.id === id);
const lockedOr = (pet: PetView, id: string, ready: string) => {
  const t = toy(pet, id);
  return t?.unlocked
    ? { text: ready, ready: true }
    : { text: `Unlocks with ${t?.need ?? 'more study'}`, ready: false };
};

const ITEMS: readonly TrayItem[] = [
  {
    item: 'kibble',
    label: 'Kibble',
    request: { action: 'feed' },
    detail: (pet) =>
      pet.kibble.bowls > 0
        ? {
            text: `${pet.kibble.bowls} ${pet.kibble.bowls === 1 ? 'bowl' : 'bowls'}`,
            ready: true,
          }
        : {
            text: `Study ${pet.kibble.minutesToNext} min for a bowl`,
            ready: false,
          },
  },
  {
    item: 'treat',
    label: 'Tuna flakes',
    request: { action: 'treat' },
    detail: (pet) =>
      pet.treats > 0
        ? {
            text: `${pet.treats} ${pet.treats === 1 ? 'treat' : 'treats'}`,
            ready: true,
          }
        : { text: 'A quiz at 75% or better earns two', ready: false },
  },
  {
    item: 'brush',
    label: 'Soft brush',
    request: { action: 'brush' },
    detail: (pet) => lockedOr(pet, 'brush', 'Brush her'),
  },
  {
    item: 'wand',
    label: 'Feather wand',
    request: { action: 'play', toy: 'wand' },
    detail: (pet) => lockedOr(pet, 'wand', 'Play'),
  },
  {
    item: 'mouse',
    label: 'Crinkle mouse',
    request: { action: 'play', toy: 'mouse' },
    detail: (pet) => lockedOr(pet, 'mouse', 'Play'),
  },
  {
    item: 'yarn',
    label: 'Yarn ball',
    request: { action: 'play', toy: 'yarn' },
    detail: (pet) => lockedOr(pet, 'yarn', 'Play'),
  },
];

// Food, treats and toys. Each one is earned by real study; the locked ones
// say what opens them.
export const CareTray = ({
  pet,
  busy,
  onCare,
}: {
  pet: PetView;
  busy: boolean;
  onCare: (request: CareRequest) => void;
}) => (
  <ul aria-label={`Care for ${pet.name}`} className="grid grid-cols-2 gap-2">
    {ITEMS.map(({ item, label, request, detail }) => {
      const { text, ready } = detail(pet);
      const locked = item !== 'kibble' && item !== 'treat' && !ready;
      return (
        <li key={item}>
          <button
            type="button"
            aria-disabled={!ready || busy}
            onClick={() => ready && !busy && onCare(request)}
            className="grid min-h-16 w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-hairline bg-ground-2 px-3 py-2 text-left transition-[border-color,transform] duration-150 hover:border-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] aria-disabled:cursor-default aria-disabled:bg-ground-3 aria-disabled:hover:border-hairline aria-disabled:active:scale-100"
          >
            <span className={locked ? 'opacity-40 grayscale-[0.6]' : ''}>
              <PetIcon item={item} />
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-[0.9375rem] font-extrabold leading-tight text-ink">
                {label}
              </span>
              <span className="block text-[0.8125rem] leading-snug text-muted">
                {locked ? <span className="sr-only">Locked. </span> : null}
                {text}
              </span>
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

'use client';

import { useEffect, useRef } from 'react';
import type { CareRequest, PetView } from '@/domain/types';
import { CareTray } from './care-tray';
import { NudgeToggle } from './nudge-toggle';
import { PetCard } from './pet-card';

// Everything about her that does not need to be on Today: name, coat, weight,
// every toy and what unlocks it, and her nudges. A sheet from the bottom.
export const PetSheet = ({
  pet,
  busy,
  onCare,
  onClose,
}: {
  pet: PetView;
  busy: boolean;
  onCare: (request: CareRequest) => void;
  onClose: () => void;
}) => {
  const close = useRef<HTMLButtonElement>(null);
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  }, [onClose]);
  // Focus moves in on open and back to the opener on close; Escape closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latestClose.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-end justify-center bg-ink/30 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={pet.name}
        className="max-h-[88dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-ground px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl"
      >
        <div className="flex justify-end">
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-xl text-2xl text-muted hover:bg-ground-3"
          >
            ×
          </button>
        </div>
        <PetCard pet={pet} />
        <CareTray pet={pet} busy={busy} onCare={onCare} />
        <NudgeToggle name={pet.name} />
      </div>
    </div>
  );
};

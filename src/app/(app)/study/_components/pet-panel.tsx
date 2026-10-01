'use client';

import { useState } from 'react';
import type { CareerProgress } from '@/domain/career/milestones';
import { BOWL_MS } from '@/domain/pet/care';
import type { CareRequest, PetView } from '@/domain/types';
import type { CareCue } from '@/game/character/study-cat';
import { useCare, usePet } from '../_hooks/use-pet';
import { CareTray } from './care-tray';
import { catLook } from './cat-look';
import { FocusCircle } from './focus-circle';
import { NudgeToggle } from './nudge-toggle';
import { PetCard } from './pet-card';

function cueFor(
  request: CareRequest,
  gramsBefore: number,
  pet: PetView,
): CareCue {
  const id = Date.now();
  if (request.action === 'feed') {
    const added = pet.grams - gramsBefore;
    return {
      id,
      kind: 'eat',
      toy: null,
      note: added > 0 ? `+${added} g` : 'As round as she gets',
    };
  }
  if (request.action === 'play') return { id, kind: 'play', toy: request.toy };
  return { id, kind: request.action, toy: null };
}

// Between sessions: the cat in her room, how she is doing, and what you can
// give her. The ring round her fills toward her next bowl of kibble.
export const PetPanel = ({ career }: { career: CareerProgress }) => {
  const pet = usePet();
  const care = useCare();
  const [cue, setCue] = useState<CareCue | null>(null);
  // She looks out of the window when she has missed you, until you touch her.
  const [greeted, setGreeted] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!pet.data) return null;
  const data = pet.data;
  const intoBowl =
    (BOWL_MS / 60_000 - data.kibble.minutesToNext) / (BOWL_MS / 60_000);

  const onCare = (request: CareRequest) => {
    setGreeted(true);
    setNote(null);
    care.mutate(request, {
      onSuccess: (result) => {
        setCue(cueFor(request, data.grams, result.pet));
        if (!result.happinessRaised)
          setNote('Just for fun. Her happiness rises again in a little while.');
      },
    });
  };

  return (
    <section aria-label={`${data.name}, your study cat`} className="space-y-4">
      <div onPointerDown={() => setGreeted(true)}>
        <FocusCircle
          progress={career}
          mood={data.missesYou && !greeted ? 'away' : 'wandering'}
          name={data.name}
          look={catLook(data)}
          cue={cue}
          ring={{ fill: intoBowl, label: `${data.name}'s next bowl of kibble` }}
        />
      </div>
      <PetCard pet={data} />
      <CareTray pet={data} busy={care.isPending} onCare={onCare} />
      {care.error || note ? (
        <p role="status" className="text-sm text-ink-2">
          {care.error?.message ?? note}
        </p>
      ) : null}
      <NudgeToggle name={data.name} />
    </section>
  );
};

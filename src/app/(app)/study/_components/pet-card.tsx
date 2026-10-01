'use client';

import { useState } from 'react';
import { PET_COATS, PET_NAME_MAX, type PetCoat } from '@/domain/pet/care';
import { PET_MOOD_LABEL } from '@/domain/pet/happiness';
import type { PetView } from '@/domain/types';
import { useUpdatePet } from '../_hooks/use-pet';
import { HappinessHearts } from './pet-icons';

const COAT_SWATCH: Record<PetCoat, { a: string; b: string; label: string }> = {
  ginger: { a: '#f2a766', b: '#fff3e6', label: 'Ginger' },
  cream: { a: '#fbf1e4', b: '#f5b7b0', label: 'Cream' },
  tuxedo: { a: '#3d3444', b: '#f7f1ea', label: 'Tuxedo' },
  grey: { a: '#b3aec2', b: '#f3f0f6', label: 'Grey' },
};

// Her name, her weight, how she feels, and how far her next bowl is.
export const PetCard = ({ pet }: { pet: PetView }) => {
  const update = useUpdatePet();
  const [draft, setDraft] = useState<string | null>(null);
  const mood = pet.missesYou ? 'Misses you' : PET_MOOD_LABEL[pet.mood];
  const save = () => {
    const name = draft?.trim();
    setDraft(null);
    if (name && name !== pet.name) update.mutate({ name });
  };

  return (
    <div className="space-y-4 rounded-[14px] border border-hairline bg-ground-2 px-4 py-4">
      <div>
        <label htmlFor="pet-name" className="sr-only">
          Your cat&apos;s name
        </label>
        <input
          id="pet-name"
          value={draft ?? pet.name}
          maxLength={PET_NAME_MAX}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-full border-b border-dashed border-hairline bg-transparent font-serif text-3xl font-black tracking-[-0.02em] text-ink focus:border-solid focus:border-focus focus:outline-none"
        />
        <p className="mt-1 text-[0.9375rem] text-ink-2">
          <span className="font-mono text-ink tabular-nums">
            {(pet.grams / 1000).toFixed(1)} kg
          </span>{' '}
          · {pet.stage}
        </p>
      </div>

      <div
        role="meter"
        aria-label="Happiness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pet.happiness}
        aria-valuetext={`${pet.happiness} of 100, ${mood.toLowerCase()}`}
        className="flex items-center justify-between gap-3"
      >
        <HappinessHearts value={pet.happiness} />
        <span className="font-serif text-base font-extrabold text-ink">
          {mood}
        </span>
      </div>

      <p className="text-sm text-ink-2">
        {pet.kibble.bowls > 0
          ? `${pet.kibble.bowls} ${pet.kibble.bowls === 1 ? 'bowl' : 'bowls'} of kibble waiting. `
          : ''}
        Next bowl after {pet.kibble.minutesToNext} more{' '}
        {pet.kibble.minutesToNext === 1 ? 'minute' : 'minutes'} of focus.
      </p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Coat</legend>
        <div className="flex gap-3">
          {PET_COATS.map((coat) => {
            const swatch = COAT_SWATCH[coat];
            return (
              <label
                key={coat}
                className="flex cursor-pointer flex-col items-center gap-1 text-xs text-ink-2"
              >
                <input
                  type="radio"
                  name="pet-coat"
                  value={coat}
                  checked={pet.coat === coat}
                  onChange={() => update.mutate({ coat })}
                  className="peer sr-only"
                />
                <span
                  className="size-11 rounded-full shadow-[inset_0_0_0_1.5px_var(--color-ink)] peer-checked:outline-2 peer-checked:outline-offset-3 peer-checked:outline-focus peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus"
                  style={{
                    background: `linear-gradient(135deg, ${swatch.a} 0 58%, ${swatch.b} 58% 100%)`,
                  }}
                />
                {swatch.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      {update.error ? (
        <p role="alert" className="text-sm text-warn">
          {update.error.message}
        </p>
      ) : null}
    </div>
  );
};

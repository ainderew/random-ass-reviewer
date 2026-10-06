'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useAutoTimeZone } from '@/app/(app)/_hooks/use-auto-time-zone';
import { useStats } from '@/app/(app)/_hooks/use-stats';
import { MusicIcon, ProgressIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { PET_MOOD_LABEL } from '@/domain/pet/happiness';
import type { TodayPlan } from '@/domain/review/today';
import {
  actionFor,
  catLine,
  currentStep,
  dayAgenda,
} from '@/domain/study/agenda';
import type { CareRequest, SessionSnapshot } from '@/domain/types';
import type { CareCue } from '@/game/character/study-cat';
import { apiFetch } from '@/lib/api-client';
import { useCare, usePet } from '../_hooks/use-pet';
import { useReviewSize } from '../_hooks/use-review-size';
import { useTodayMusic } from '../_hooks/use-today-music';
import { AgendaList } from './agenda-list';
import { catLook, cueFor } from './cat-look';
import { FocusCircle } from './focus-circle';
import { PetSheet } from './pet-sheet';
import { QuickCare } from './quick-care';

const NO_PROGRESS = { focusMs: 0, highGrades: 0, cardsRecalled: 0 };

// Open the app, see the cat, and she tells you the one next thing. Everything
// else is a tap away.
export const TodayView = () => {
  useAutoTimeZone();
  const pet = usePet();
  const { data: stats } = useStats();
  const plan = useQuery({
    queryKey: ['today-plan'],
    queryFn: () => apiFetch<TodayPlan>('/api/study-plan/today'),
  });
  const session = useQuery({
    queryKey: ['session', 'active'],
    queryFn: () => apiFetch<SessionSnapshot | null>('/api/session/active'),
    // A session may have started or ended on the Focus tab a moment ago.
    staleTime: 0,
  });
  const [size, setSize] = useReviewSize();
  const care = useCare();
  const [cue, setCue] = useState<CareCue | null>(null);
  const [greeted, setGreeted] = useState(false);
  const [sheet, setSheet] = useState(false);
  const music = useTodayMusic();

  if (!pet.data || !plan.data) {
    return (
      <div
        role="status"
        aria-label="Loading today"
        className="mx-auto grid w-full max-w-md justify-items-center gap-4"
      >
        <Skeleton className="aspect-square w-[min(68vw,30dvh,20rem)] rounded-full" />
        <Skeleton className="h-10 w-56 rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        {plan.isError || pet.isError ? (
          <button
            type="button"
            className="underline"
            onClick={() => void Promise.all([plan.refetch(), pet.refetch()])}
          >
            Today could not load. Try again
          </button>
        ) : null}
      </div>
    );
  }

  const cat = pet.data;
  const steps = dayAgenda({
    plan: plan.data,
    size,
    focusTodayMs: stats?.today.creditedMs ?? 0,
    catName: cat.name,
  });
  const focusing = Boolean(session.data);
  const missing = cat.missesYou && !greeted;
  const action = focusing
    ? { label: 'Back to your session', href: '/focus' }
    : actionFor(currentStep(steps));
  const done = steps.filter((s) => s.state === 'done').length;
  const hearts = Math.max(0, Math.min(5, Math.round(cat.happiness / 20)));

  const onCare = (request: CareRequest) => {
    setSheet(false);
    setGreeted(true);
    care.mutate(request, {
      onSuccess: (result) => setCue(cueFor(request, cat.grams, result.pet)),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div onPointerDown={() => setGreeted(true)}>
        <FocusCircle
          progress={stats?.career ?? NO_PROGRESS}
          mood={missing ? 'away' : focusing ? 'studying' : 'wandering'}
          name={cat.name}
          look={catLook(cat)}
          cue={cue}
          ring={{
            fill: done / steps.length,
            label: `Today: ${done} of ${steps.length} done`,
          }}
          corner={
            <button
              type="button"
              className="music-toggle"
              aria-pressed={music.on}
              aria-label="Background music"
              onClick={music.toggle}
            >
              <MusicIcon size={20} />
            </button>
          }
        />
      </div>

      <p
        aria-live="polite"
        className="relative mx-auto -mt-1 max-w-[19rem] rounded-2xl bg-ground-2 px-4 py-2.5 text-center font-serif text-[1.0625rem] leading-snug font-extrabold text-ink shadow-[0_0_0_1px_var(--color-hairline),0_6px_16px_rgba(56,39,61,0.1)] before:absolute before:-top-1.5 before:left-1/2 before:size-3 before:-translate-x-1/2 before:rotate-45 before:bg-ground-2 before:shadow-[-1px_-1px_0_var(--color-hairline)]"
      >
        {catLine(steps, { missesYou: missing, focusing })}
      </p>

      <button
        type="button"
        onClick={() => setSheet(true)}
        className="mx-auto flex min-h-11 items-center gap-2 rounded-full px-3 text-[0.9375rem] text-ink-2 hover:bg-ground-3"
      >
        <span className="font-serif font-black text-ink">{cat.name}</span>
        <span aria-hidden="true" className="tracking-[1px] text-focus">
          {'♥'.repeat(hearts)}
          <span className="text-hairline">{'♥'.repeat(5 - hearts)}</span>
        </span>
        <span>{cat.missesYou ? 'Misses you' : PET_MOOD_LABEL[cat.mood]}</span>
      </button>

      <AgendaList steps={steps} size={size} onSize={setSize} />

      <QuickCare pet={cat} busy={care.isPending} onCare={onCare} />
      {care.error ? (
        <p role="status" className="text-center text-sm text-ink-2">
          {care.error.message}
        </p>
      ) : null}

      <Link
        href="/review/progress"
        className="flex min-h-12 items-center justify-between gap-3 rounded-[14px] border border-dashed border-hairline px-3.5 text-[0.9375rem] text-ink-2 hover:bg-ground-2"
      >
        <span className="flex items-center gap-2.5">
          <ProgressIcon size={20} />
          Your progress this week
        </span>
        <span aria-hidden="true">›</span>
      </Link>

      {action ? (
        <Link
          href={action.href}
          className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-(--z-sticky) flex min-h-14 items-center justify-center rounded-[14px] bg-focus text-base font-semibold text-white shadow-[0_-10px_18px_var(--color-ground)] transition-[background-color,transform] duration-150 hover:bg-focus-deep active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:bottom-6"
        >
          {action.label}
        </Link>
      ) : null}

      {sheet ? (
        <PetSheet
          pet={cat}
          busy={care.isPending}
          onCare={onCare}
          onClose={() => setSheet(false)}
        />
      ) : null}
    </div>
  );
};

'use client';
import { useState } from 'react';
import { useProfile, useUpdateProfile } from '@/app/(app)/_hooks/use-profile';
import { Button } from '@/components/ui/button';

export const StudyPlanForm = () => {
  const { data: profile, isError } = useProfile();
  const update = useUpdateProfile();
  const [month, setMonth] = useState<string | null>(null);
  const [newCards, setNewCards] = useState<number | null>(null);
  if (!profile)
    return (
      <p role="status" className="text-ink-2">
        {isError
          ? 'Could not load study settings. Reload to try again.'
          : 'Loading study settings...'}
      </p>
    );
  const field =
    'min-h-11 rounded-md border border-hairline bg-ground px-3 text-base text-ink';
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          examMonth: (month ?? profile.examMonth) || null,
          dailyNewCards: newCards ?? profile.dailyNewCards,
        });
      }}
    >
      <h2 className="font-serif text-2xl text-ink">Medtech study plan</h2>
      <p className="text-ink-2">
        Choose a planning month. This is your target, not an official PRC exam
        date.
      </p>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-2 text-ink-2">
          Target exam month
          <input
            type="month"
            className={field}
            value={month ?? profile.examMonth ?? ''}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-ink-2">
          Maximum new cards each day
          <input
            type="number"
            min={0}
            max={20}
            required
            className={field}
            value={newCards ?? profile.dailyNewCards}
            onChange={(e) => setNewCards(Number(e.target.value))}
          />
        </label>
      </div>
      <p className="text-ink-2">
        Set new cards to zero to catch up on due reviews. Reviews still earn the
        same credit when you choose Again.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setMonth('2027-03')}>
          Use March 2027
        </Button>
        <Button type="submit" disabled={update.isPending}>
          Save study plan
        </Button>
      </div>
      {update.isError ? (
        <p role="alert" className="text-warn">
          Could not save your plan. Try again.
        </p>
      ) : update.isSuccess ? (
        <p role="status" className="text-insight">
          Study plan saved.
        </p>
      ) : null}
    </form>
  );
};

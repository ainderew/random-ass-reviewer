'use client';

import { useEffect } from 'react';
import { useProfile, useUpdateProfile } from './use-profile';

// Day boundaries, streaks and the cat's nudges follow the student's clock.
// A new account starts on UTC; the first visit quietly sets the browser's
// zone instead of asking.
export function useAutoTimeZone(): void {
  const { data: profile } = useProfile();
  const { mutate } = useUpdateProfile();
  const current = profile?.timeZone;
  useEffect(() => {
    if (current !== 'UTC') return;
    let zone: string | undefined;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      zone = undefined;
    }
    if (zone && zone !== 'UTC') mutate({ timeZone: zone });
  }, [current, mutate]);
}

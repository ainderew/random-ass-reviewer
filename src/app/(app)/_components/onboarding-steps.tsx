'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type { Profile } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { useProfile, useUpdateProfile } from '../_hooks/use-profile';

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

interface Step {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

function stepsFor(profile: Profile, zone: string | null): Step[] {
  const zoneSet = profile.timeZone !== 'UTC' || zone === 'UTC';
  return [
    {
      key: 'zone',
      label: 'Confirm your time zone',
      done: zoneSet,
      href: '/study',
    },
    {
      key: 'notes',
      label: 'Upload your first notes',
      done: profile.progress.hasNotes,
      href: '/notes',
    },
    {
      key: 'session',
      label: 'Run a 5-minute focus session',
      done: profile.progress.hasSession,
      href: '/study',
    },
    {
      key: 'build',
      label: 'Place your first building',
      done: profile.progress.hasPlacement,
      href: '/island',
    },
  ];
}

// Inline, on the page it belongs to, gone when done. No overlay tour: those
// get dismissed by reflex and teach nothing. Completion lives on the server.
export const OnboardingSteps = () => {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const zone = browserTimeZone();

  const steps = profile ? stepsFor(profile, zone) : [];
  const allDone = steps.length > 0 && steps.every((s) => s.done);
  const finished = profile?.onboardedAt !== null;

  // The last step completing is the natural end. Record it once.
  useEffect(() => {
    if (profile && allDone && !finished && !update.isPending)
      update.mutate({ onboarded: true });
  }, [profile, allDone, finished, update]);

  if (!profile || finished || allDone) return null;
  const next = steps.find((s) => !s.done);

  return (
    <section
      aria-label="Getting started"
      className="fade-in space-y-3 rounded-lg border border-hairline bg-ground-2 px-4 py-3"
    >
      <ol className="space-y-1.5 text-sm">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className={`flex items-center gap-2 ${step.done ? 'text-muted line-through' : 'text-ink'}`}
          >
            <span className="font-mono text-xs text-muted">{i + 1}</span>
            {step.done ? (
              <span>{step.label}</span>
            ) : (
              <Link href={step.href} className="hover:text-focus">
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {next?.key === 'zone' && zone ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-ink-2">
            Your clock says {zone}. Nights on the island follow it.
          </span>
          <Button
            onClick={() => update.mutate({ timeZone: zone })}
            disabled={update.isPending}
            aria-busy={update.isPending}
          >
            Use {zone}
          </Button>
        </div>
      ) : null}
      <Button
        variant="ghost"
        onClick={() => update.mutate({ onboarded: true })}
        disabled={update.isPending}
      >
        Skip for now
      </Button>
    </section>
  );
};

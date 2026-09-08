'use client';

import Link from 'next/link';
import { useProfile, useUpdateProfile } from '@/app/(app)/_hooks/use-profile';
import { DAILY_CREDITABLE_MS } from '@/domain/economy/constants';
import { useAudioPreference } from '@/game/systems/use-audio-preference';
import {
  setQualityOverride,
  useQualityOverride,
} from '@/game/systems/quality-store';
import { useIslandListPreference } from '@/lib/use-island-list-preference';
import { useMotionPreference } from '@/lib/use-reduced-motion';

const HOUR = 3_600_000;
const CAP_OPTIONS = [2, 3, 4, 5, 6, 8].map((h) => ({
  label: `${h} hours`,
  value: h * HOUR,
}));
const BREAK_OPTIONS = [25, 40, 50, 60, 90].map((m) => ({
  label: `${m} minutes`,
  value: m * 60_000,
}));

const select =
  'min-h-11 rounded-md border border-hairline bg-ground px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

// Everything here only ever narrows what the product does: a lower cap, an
// earlier break, less motion, a lighter island. Nothing here raises a limit.
export const PreferencesForm = () => {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const [audio, setAudio] = useAudioPreference();
  const [motion, setMotion] = useMotionPreference();
  const [listView, setListView] = useIslandListPreference();
  const quality = useQualityOverride();

  const capMs = Math.min(
    profile?.dailyCapMs ?? DAILY_CREDITABLE_MS,
    DAILY_CREDITABLE_MS,
  );
  const breakMs = profile?.breakReminderMs ?? 50 * 60_000;

  return (
    <section aria-label="Preferences" className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl text-ink">Studying</h2>
        <p className="max-w-[46ch] text-sm leading-relaxed text-ink-2">
          The daily cap can go down, never above eight hours. Rest is part of
          learning.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Daily creditable time
          <select
            className={select}
            value={capMs}
            disabled={!profile || update.isPending}
            onChange={(e) =>
              update.mutate({ dailyCapMs: Number(e.target.value) })
            }
          >
            {CAP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Break reminder after
          <select
            className={select}
            value={breakMs}
            disabled={!profile || update.isPending}
            onChange={(e) =>
              update.mutate({ breakReminderMs: Number(e.target.value) })
            }
          >
            {BREAK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1 border-t border-hairline pt-6">
        <h2 className="font-serif text-2xl text-ink">Sound and motion</h2>
      </div>
      <div className="space-y-3">
        <label className="flex min-h-11 items-center gap-3 text-ink">
          <input
            type="checkbox"
            checked={audio}
            onChange={(e) => setAudio(e.target.checked)}
            className="size-5 accent-focus"
          />
          Ambient sound and reward tones
        </label>
        <label className="flex min-h-11 items-center gap-3 text-ink">
          <input
            type="checkbox"
            checked={motion === 'reduce'}
            onChange={(e) => setMotion(e.target.checked ? 'reduce' : 'system')}
            className="size-5 accent-focus"
          />
          Reduce motion, whatever the system setting says
        </label>
      </div>

      <div className="space-y-1 border-t border-hairline pt-6">
        <h2 className="font-serif text-2xl text-ink">Island</h2>
        <p className="max-w-[46ch] text-sm leading-relaxed text-ink-2">
          Quality is chosen for your device on first load. Force it if you know
          better.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Graphics quality
          <select
            className={select}
            value={quality}
            onChange={(e) =>
              setQualityOverride(e.target.value as typeof quality)
            }
          >
            <option value="auto">Automatic</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-3 self-end text-ink">
          <input
            type="checkbox"
            checked={listView}
            onChange={(e) => setListView(e.target.checked)}
            className="size-5 accent-focus"
          />
          Show the island as a list instead of 3D
        </label>
      </div>

      <div className="space-y-2 border-t border-hairline pt-6">
        <h2 className="font-serif text-2xl text-ink">Your data</h2>
        <p className="max-w-[46ch] text-sm leading-relaxed text-ink-2">
          Everything Aloft holds about you, as one JSON file.{' '}
          <a
            href="/api/me/export"
            className="text-focus underline underline-offset-4"
            download
          >
            Download export
          </a>
          . Curious what the numbers mean?{' '}
          <Link
            href="/how-it-works"
            className="text-focus underline underline-offset-4"
          >
            How rewards work
          </Link>
          .
        </p>
      </div>
    </section>
  );
};

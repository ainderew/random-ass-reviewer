'use client';

import type { Milestone } from '@/domain/career/milestones';
import { useSpringPop } from '@/game/systems/juice/use-spring-pop';

// What this session added to the room. Shown on the result screen, after the
// numbers and the chest, in the same voice as everything else.
export const MilestoneReveal = ({
  milestones,
}: {
  milestones: Milestone[];
}) => {
  const pop = useSpringPop();
  if (milestones.length === 0) return null;
  return (
    <section
      aria-label="New on the wall"
      className={`space-y-3 ${pop.className}`}
    >
      <h2 className="font-serif text-2xl text-ink">
        {milestones.length === 1
          ? 'New on the wall'
          : `${milestones.length} new on the wall`}
      </h2>
      <ul className="space-y-2">
        {milestones.map((m) => (
          <li
            key={m.id}
            className="rounded-lg border border-focus/40 bg-ground-2 px-4 py-3"
          >
            <p className="font-medium text-ink">{m.label}</p>
            <p className="text-sm leading-relaxed text-ink-2">{m.line}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

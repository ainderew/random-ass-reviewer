import type { SessionStreak } from '@/domain/types';
import { useSpringPop } from '@/game/systems/juice/use-spring-pop';

// Milestones get a moment. A used freeze gets a warm line, after the fact,
// never framed as a near-loss.
export const StreakNotice = ({ streak }: { streak: SessionStreak }) => {
  const pop = useSpringPop();
  if (streak.milestone !== null) {
    return (
      <div
        role="status"
        className={`${pop.className} rounded-lg border border-hairline bg-ground-2 px-4 py-3`}
      >
        <p className="font-serif text-xl text-ink">
          {streak.milestone} days in a row
        </p>
        <p className="text-sm text-ink-2">
          +{streak.milestoneInsight} Insight for showing up {streak.milestone}{' '}
          days running.
        </p>
      </div>
    );
  }
  if (streak.freezeUsed) {
    return (
      <p
        role="status"
        className={`${pop.className} text-sm leading-relaxed text-ink-2`}
      >
        Streak freeze used. Still going, {streak.days} days.{' '}
        {streak.freezesRemaining} left this month.
      </p>
    );
  }
  return null;
};

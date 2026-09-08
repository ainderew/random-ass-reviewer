import { useEffect } from 'react';
import type { SessionLevelUp } from '@/domain/types';
import { playFanfare } from '@/game/systems/juice/play-pitched';
import { useAudioPreference } from '@/game/systems/use-audio-preference';
import { useSpringPop } from '@/game/systems/juice/use-spring-pop';

// A number alone means nothing. Name what opened.
export const LevelUpBanner = ({ levelUp }: { levelUp: SessionLevelUp }) => {
  const pop = useSpringPop();
  const [audioOn] = useAudioPreference();
  useEffect(() => {
    if (audioOn) playFanfare([392, 494, 587, 784], 110);
  }, [audioOn]);
  const unlocks = levelUp.unlocks.length ? levelUp.unlocks.join(', ') : null;
  return (
    <div
      role="status"
      className={`${pop.className} rounded-lg border border-focus/40 bg-ground-2 px-4 py-3`}
    >
      <p className="font-serif text-xl text-ink">Level {levelUp.level}</p>
      <p className="text-sm text-ink-2">
        {unlocks
          ? `${unlocks} unlocked.`
          : 'Keep going. The next piece is close.'}
      </p>
    </div>
  );
};

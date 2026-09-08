'use client';

import type { QuizResult as QuizResultData } from '@/domain/types';
import { DiamondGlyph } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useCountUp } from '../_hooks/use-count-up';
import { TimerFrame } from './timer-frame';

// The bonus, then the chest. Anticipation first, reward second.
export const QuizResult = ({
  result,
  onContinue,
  continuing,
}: {
  result: QuizResultData;
  onContinue: () => void;
  continuing: boolean;
}) => {
  const insight = useCountUp(result.insightAwarded);
  return (
    <TimerFrame
      label="Quiz result"
      actions={
        <Button
          size="lg"
          block
          onClick={onContinue}
          disabled={continuing}
          aria-busy={continuing}
        >
          {continuing ? 'Saving…' : 'Open your reward'}
        </Button>
      }
    >
      <div className="rise-in space-y-6">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl leading-tight text-ink">
            {result.correct} of {result.total}
          </h1>
          <p className="text-ink-2">
            {result.multiplier > 1
              ? `Your Focus for this session is multiplied by ${result.multiplier.toFixed(2)}.`
              : 'No bonus this time. Your Focus is unchanged.'}
          </p>
        </div>
        {result.insightAwarded > 0 ? (
          <p className="flex items-center gap-2 font-mono text-4xl text-insight tabular-nums">
            <DiamondGlyph size={26} />+{insight}{' '}
            <span className="text-xl">Insight</span>
          </p>
        ) : null}
      </div>
    </TimerFrame>
  );
};

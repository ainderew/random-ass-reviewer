'use client';

import type { QuizResult as QuizResultData } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { TimerFrame } from './timer-frame';

export const QuizResult = ({
  result,
  onContinue,
  continuing,
}: {
  result: QuizResultData;
  onContinue: () => void;
  continuing: boolean;
}) => {
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
          {continuing ? 'Saving…' : 'Save session'}
        </Button>
      }
    >
      <div className="rise-in space-y-6">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl leading-tight text-ink">
            {result.correct} of {result.total}
          </h1>
          <p className="text-ink-2">
            Quiz complete. Your answers have been saved.
          </p>
        </div>
      </div>
    </TimerFrame>
  );
};

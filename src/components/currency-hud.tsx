'use client';

import { useStats } from '@/app/(app)/_hooks/use-stats';
import { CurrencyBadge } from '@/components/ui/currency-badge';

// Reads the hydrated stats query. Ending a session invalidates it, so the
// numbers move without a reload. Phones get the two balances only; level
// and streak live on the study screen where there is room to read them.
export const CurrencyHud = () => {
  const { data } = useStats();
  if (!data) return null;
  const { stats } = data;

  return (
    <dl className="flex items-center gap-4 md:gap-5">
      <div>
        <dt className="sr-only">Focus balance</dt>
        <dd>
          <CurrencyBadge kind="focus" amount={stats.focusBalance} compact />
        </dd>
      </div>
      <div>
        <dt className="sr-only">Insight balance</dt>
        <dd>
          <CurrencyBadge kind="insight" amount={stats.insightBalance} compact />
        </dd>
      </div>
      <div className="hidden text-sm text-ink-2 md:block">
        <dt className="sr-only">Level</dt>
        <dd>Level {stats.level}</dd>
      </div>
    </dl>
  );
};

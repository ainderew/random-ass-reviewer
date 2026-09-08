import type { Currency } from '@/domain/types';
import { BoltGlyph, DiamondGlyph } from '@/components/icons';

const meta: Record<
  Currency,
  { label: string; tone: string; Glyph: typeof BoltGlyph }
> = {
  focus: { label: 'Focus', tone: 'text-focus', Glyph: BoltGlyph },
  insight: { label: 'Insight', tone: 'text-insight', Glyph: DiamondGlyph },
};

// `compact` keeps the word for screen readers only. Phones get the glyph and
// the number; the glyph shape tells the two currencies apart without colour.
export const CurrencyBadge = ({
  kind,
  amount,
  size = 'sm',
  compact = false,
  signed = false,
}: {
  kind: Currency;
  amount: number;
  size?: 'sm' | 'lg';
  compact?: boolean;
  signed?: boolean;
}) => {
  const { label, tone, Glyph } = meta[kind];
  const text =
    size === 'lg'
      ? 'font-mono text-4xl font-medium tabular-nums'
      : 'text-sm tabular-nums';
  const value = `${signed && amount >= 0 ? '+' : ''}${amount.toLocaleString()}`;
  return (
    <span className={`inline-flex items-center gap-1.5 ${text} ${tone}`}>
      <Glyph size={size === 'lg' ? 22 : 14} />
      <span>
        {value} <span className={compact ? 'sr-only' : ''}>{label}</span>
      </span>
    </span>
  );
};

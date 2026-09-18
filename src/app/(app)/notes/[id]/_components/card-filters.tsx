import type { Card } from '@/domain/types';
export type CardFilter = 'all' | 'needs-review' | 'approved';
export const CardFilters = ({
  cards,
  value,
  onChange,
  disabled,
}: {
  cards: Card[];
  value: CardFilter;
  onChange: (value: CardFilter) => void;
  disabled: boolean;
}) => {
  const approved = cards.filter(
    (card) => card.reviewStatus === 'approved',
  ).length;
  const choices: { value: CardFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All cards', count: cards.length },
    {
      value: 'needs-review',
      label: 'Needs review',
      count: cards.length - approved,
    },
    { value: 'approved', label: 'Approved', count: approved },
  ];
  return (
    <div
      role="group"
      aria-label="Filter cards"
      className="flex flex-wrap gap-2 border-b border-hairline pb-4"
    >
      {choices.map((choice) => (
        <button
          type="button"
          key={choice.value}
          disabled={disabled}
          aria-pressed={choice.value === value}
          onClick={() => onChange(choice.value)}
          className={`min-h-11 rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50 ${value === choice.value ? 'bg-ink text-ground-2' : 'text-ink-2 hover:bg-ground-3'}`}
        >
          {choice.label}{' '}
          <span className="ml-1 tabular-nums">{choice.count}</span>
        </button>
      ))}
    </div>
  );
};

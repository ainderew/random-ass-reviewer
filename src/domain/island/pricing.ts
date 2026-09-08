import { REMOVAL_REFUND_RATIO } from './constants';

export interface Price {
  priceFocus: number;
  priceInsight: number;
}

export function canAfford(
  balances: { focus: number; insight: number },
  price: Price,
): boolean {
  return (
    balances.focus >= price.priceFocus && balances.insight >= price.priceInsight
  );
}

// Half back, rounded down, per currency.
export function refundForRemoval(price: Price): {
  focus: number;
  insight: number;
} {
  return {
    focus: Math.floor(price.priceFocus * REMOVAL_REFUND_RATIO),
    insight: Math.floor(price.priceInsight * REMOVAL_REFUND_RATIO),
  };
}

export function describePrice(price: Price): string {
  const parts = [];
  if (price.priceFocus > 0) parts.push(`${price.priceFocus} Focus`);
  if (price.priceInsight > 0) parts.push(`${price.priceInsight} Insight`);
  return parts.length ? parts.join(' and ') : 'Free';
}

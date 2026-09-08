import { canAfford, describePrice, refundForRemoval } from './pricing';

describe('refundForRemoval', () => {
  it('refunds exactly half, rounded down', () => {
    expect(refundForRemoval({ priceFocus: 125, priceInsight: 0 })).toEqual({
      focus: 62,
      insight: 0,
    });
    expect(refundForRemoval({ priceFocus: 1800, priceInsight: 41 })).toEqual({
      focus: 900,
      insight: 20,
    });
  });
});

describe('canAfford', () => {
  it('needs both currencies', () => {
    expect(
      canAfford(
        { focus: 100, insight: 0 },
        { priceFocus: 100, priceInsight: 0 },
      ),
    ).toBe(true);
    expect(
      canAfford(
        { focus: 100, insight: 0 },
        { priceFocus: 100, priceInsight: 1 },
      ),
    ).toBe(false);
  });
});

describe('describePrice', () => {
  it('reads naturally', () => {
    expect(describePrice({ priceFocus: 120, priceInsight: 0 })).toBe(
      '120 Focus',
    );
    expect(describePrice({ priceFocus: 1800, priceInsight: 40 })).toBe(
      '1800 Focus and 40 Insight',
    );
    expect(describePrice({ priceFocus: 0, priceInsight: 0 })).toBe('Free');
  });
});

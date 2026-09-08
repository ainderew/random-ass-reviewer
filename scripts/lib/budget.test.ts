import { MAX_ASSET_BYTES, MAX_ASSET_TRIANGLES } from '@/domain/assets/types';
import { assertWithinBudget } from './budget';

describe('assertWithinBudget', () => {
  it('passes at the limits', () => {
    expect(() =>
      assertWithinBudget('ok', {
        bytes: MAX_ASSET_BYTES,
        triangles: MAX_ASSET_TRIANGLES,
      }),
    ).not.toThrow();
  });

  it('fails one byte over', () => {
    expect(() =>
      assertWithinBudget('big', { bytes: MAX_ASSET_BYTES + 1, triangles: 10 }),
    ).toThrow(/over budget/);
  });

  it('fails one triangle over', () => {
    expect(() =>
      assertWithinBudget('dense', {
        bytes: 10,
        triangles: MAX_ASSET_TRIANGLES + 1,
      }),
    ).toThrow(/triangles/);
  });
});

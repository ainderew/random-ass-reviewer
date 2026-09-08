import { costCents } from './pricing';

describe('costCents', () => {
  it('prices the four usage fields separately, cache reads at a tenth', () => {
    const base = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    };
    const million = 1_000_000;
    expect(
      costCents('claude-opus-5', { ...base, inputTokens: million }),
    ).toBeCloseTo(500, 5);
    expect(
      costCents('claude-opus-5', { ...base, cacheReadInputTokens: million }),
    ).toBeCloseTo(50, 5);
    expect(
      costCents('claude-opus-5', {
        ...base,
        cacheCreationInputTokens: million,
      }),
    ).toBeCloseTo(625, 5);
    expect(
      costCents('claude-opus-5', { ...base, outputTokens: million }),
    ).toBeCloseTo(2500, 5);
  });

  it('bills unknown models at the top rate rather than under-counting', () => {
    const usage = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    };
    expect(costCents('claude-mystery-9', usage)).toBe(
      costCents('claude-opus-5', usage),
    );
  });
});

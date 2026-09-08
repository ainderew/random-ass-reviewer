import type { TokenUsage } from './types';

// USD per million tokens, first-party API rates.
interface Rate {
  input: number;
  output: number;
}

const RATES: Record<string, Rate> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

function rateFor(model: string): Rate {
  const exact = RATES[model];
  if (exact) return exact;
  // Unknown id: bill at the most expensive rate rather than under-count.
  return RATES['claude-opus-5']!;
}

// Cost in cents, computed from the four usage fields separately.
export function costCents(model: string, usage: TokenUsage): number {
  const rate = rateFor(model);
  const perToken = (usd: number) => usd / 1_000_000;
  const usd =
    usage.inputTokens * perToken(rate.input) +
    usage.cacheReadInputTokens * perToken(rate.input) * CACHE_READ_MULTIPLIER +
    usage.cacheCreationInputTokens *
      perToken(rate.input) *
      CACHE_WRITE_MULTIPLIER +
    usage.outputTokens * perToken(rate.output);
  return usd * 100;
}

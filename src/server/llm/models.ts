import { env } from '@/lib/env';

// Default to Opus. Card quality from messy student notes is the whole
// product; cost tiering is a decision for real usage data, not upfront.
export const MODELS = {
  cardGeneration: env.ANTHROPIC_MODEL_CARDS,
  handwritingOcr: env.ANTHROPIC_MODEL_CARDS,
} as const;

// Non-streaming ceiling. Covers adaptive thinking plus the card batch.
export const CARD_MAX_TOKENS = 16_000;
export const OCR_MAX_TOKENS = 8_000;

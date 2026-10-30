import { env } from '@/lib/env';

// Default to Opus. Card quality from messy student notes is the whole
// product; cost tiering is a decision for real usage data, not upfront.
export const MODELS = {
  cardGeneration: env.ANTHROPIC_MODEL_CARDS,
  handwritingOcr: env.ANTHROPIC_MODEL_CARDS,
} as const;

// A false positive from the safety classifiers should not cost the student a
// section, so a declined passage gets one retry on the model before it.
export const REFUSAL_FALLBACK_MODEL = 'claude-opus-5';

// Thinking counts toward this as well as the card batch. A dense page runs past
// 16,000, and the SDK refuses a non-streaming call much above 21,000.
export const CARD_MAX_TOKENS = 20_000;
export const OCR_MAX_TOKENS = 8_000;
// Three options and four short explanations for one card.
export const CHOICE_MAX_TOKENS = 8_000;

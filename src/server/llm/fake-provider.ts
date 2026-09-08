import { z } from 'zod';
import { env } from '@/lib/env';
import { AppError } from '@/server/errors';
import type { LlmProvider } from './provider';
import type { ImageRequest, LlmResult, StructuredRequest } from './types';

const ZERO = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
};

// Sentence-shaped "cards" straight from the passage: each answer is a real
// sentence and its own quote, so every card passes the verbatim guard.
export function cardsFromPassage(passage: string): Array<{
  question: string;
  answer: string;
  sourceQuote: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}> {
  const sentences = passage
    .replace(/^#+\s.*$/gm, '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20 && s.length <= 400);
  const difficulties = ['easy', 'medium', 'hard'] as const;
  return sentences.slice(0, 5).map((sentence, i) => {
    const subject = sentence.split(/\s+/).slice(0, 4).join(' ');
    return {
      question: `What do your notes say about "${subject}"?`,
      answer: sentence,
      sourceQuote: sentence,
      difficulty: difficulties[i % 3] ?? 'medium',
      tags: ['notes'],
    };
  });
}

// Development and end-to-end tests only. No model, no key, no network:
// cards come from the passage itself, photos transcribe to nothing.
export class FakeLlmProvider implements LlmProvider {
  readonly name = 'fake' as const;

  constructor(nodeEnv: string = env.NODE_ENV) {
    if (nodeEnv === 'production') {
      throw new Error('FakeLlmProvider must not be constructed in production');
    }
  }

  async generateStructured<T>(
    req: StructuredRequest<T>,
  ): Promise<LlmResult<T>> {
    const passage = req.userText.replace(/^Passage:\s*/i, '');
    const candidate = { cards: cardsFromPassage(passage) };
    const parsed = req.schema.safeParse(candidate);
    if (!parsed.success) {
      // A schema this provider does not know: hand back the emptiest valid shape.
      const fallback = z.object({}).passthrough().safeParse({});
      if (!fallback.success)
        throw new AppError('VALIDATION', 'FakeLlmProvider: unknown schema');
      return { data: req.schema.parse({ cards: [] }), usage: ZERO };
    }
    return { data: parsed.data, usage: ZERO };
  }

  async generateFromImage<T>(req: ImageRequest<T>): Promise<LlmResult<T>> {
    return { data: req.schema.parse({ text: '' }), usage: ZERO };
  }

  async countTokens(req: { model: string; text: string }): Promise<number> {
    return Math.ceil(req.text.length / 4);
  }
}

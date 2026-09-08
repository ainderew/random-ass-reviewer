import { z } from 'zod';

// Keep this stable. Schema changes trigger a recompilation on the API side,
// and the descriptions are what the model reads to understand each field.
export const generatedCardSchema = z.object({
  question: z
    .string()
    .min(5)
    .max(300)
    .describe('A clear question answerable from the passage.'),
  answer: z
    .string()
    .min(1)
    .max(1000)
    .describe('The answer, concise and complete.'),
  sourceQuote: z
    .string()
    .min(10)
    .max(500)
    .describe(
      'A verbatim quote from the provided source text that supports this answer. Copy it exactly, character for character.',
    ),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string().min(1).max(30)).max(5),
});

export type GeneratedCard = z.infer<typeof generatedCardSchema>;

export const cardBatchSchema = z.object({
  cards: z.array(generatedCardSchema).max(12),
});

export type CardBatch = z.infer<typeof cardBatchSchema>;

export const transcriptionSchema = z.object({
  text: z
    .string()
    .describe(
      'The transcribed notes as markdown. Empty if nothing is readable.',
    ),
});

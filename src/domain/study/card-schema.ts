import { z } from 'zod';
import { quizContentSchema } from './quiz-content';
import { subjectSchema } from './medtech';

// Keep this stable. Schema changes trigger a recompilation on the API side,
// and the descriptions are what the model reads to understand each field.
export const generatedCardSchema = z.object({
  question: z
    .string()
    .min(5)
    .max(300)
    .describe(
      'A standalone question about the subject. Never mentions the notes or the passage.',
    ),
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
  quiz: quizContentSchema.nullable().default(null),
  subject: subjectSchema.nullable().default(null),
  topic: z.string().min(1).max(100).nullable().default(null),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string().min(1).max(30)).max(5),
});

export type GeneratedCard = z.infer<typeof generatedCardSchema>;

export const cardBatchSchema = z.object({
  // Room for a section that is all the student's own questions.
  cards: z.array(generatedCardSchema).max(20),
});

export type CardBatch = z.infer<typeof cardBatchSchema>;

// "Make choices" on one card. Unlike options copied from the student's own
// item, these were written by the model, so every one must be explained.
const choiceExplanation = z.string().trim().min(10).max(1000);
export const generatedChoicesSchema = z.object({
  explanation: choiceExplanation.describe(
    'Why the correct answer is right, from the passage.',
  ),
  distractors: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(300),
        explanation: choiceExplanation.describe(
          'What the notes say instead of this wrong option.',
        ),
      }),
    )
    .length(3),
});

export const transcriptionSchema = z.object({
  text: z
    .string()
    .describe(
      'The transcribed notes as markdown. Empty if nothing is readable.',
    ),
});

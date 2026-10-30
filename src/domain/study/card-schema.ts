import { z } from 'zod';
import { quizContentSchema } from './quiz-content';
import { subjectSchema } from './medtech';

// Room for a board-style case, which runs longer than a one-line question.
export const QUESTION_MAX = 600;

export const questionTypeSchema = z.enum([
  'own',
  'recall',
  'distinction',
  'reasoning',
  'application',
]);

// Keep this stable. Schema changes trigger a recompilation on the API side,
// and the descriptions are what the model reads to understand each field.
// Limits live on `generatedCardSchema` and are stated here in words: a limit in
// this schema would fail the whole batch over one long question.
const candidateCardSchema = z.object({
  question: z
    .string()
    .describe(
      'A standalone question about the subject, at most 600 characters. Never mentions the notes or the passage.',
    ),
  answer: z
    .string()
    .describe('The answer, concise and complete. At most 1000 characters.'),
  sourceQuote: z
    .string()
    .describe(
      'A verbatim quote from the passage that supports this answer, 10 to 500 characters. Copy it exactly, character for character.',
    ),
  quiz: z
    .object({
      explanation: z.string(),
      distractors: z.array(
        z.object({ text: z.string(), explanation: z.string() }),
      ),
    })
    .nullable()
    .default(null),
  subject: subjectSchema.nullable().default(null),
  topic: z.string().nullable().default(null),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionType: questionTypeSchema.default('recall'),
  tags: z.array(z.string()),
});

export type CandidateCard = z.infer<typeof candidateCardSchema>;

export const generatedCardSchema = candidateCardSchema.extend({
  question: z.string().min(5).max(QUESTION_MAX),
  answer: z.string().min(1).max(1000),
  sourceQuote: z.string().min(10).max(500),
  quiz: quizContentSchema.nullable().default(null),
  topic: z.string().min(1).max(100).nullable().default(null),
  tags: z.array(z.string().min(1).max(30)).max(5),
});

export type GeneratedCard = z.infer<typeof generatedCardSchema>;

export const cardBatchSchema = z.object({
  cards: z.array(candidateCardSchema),
  unanswered: z
    .number()
    .int()
    .default(0)
    .describe(
      "How many of the student's own questions were skipped because neither the passage nor the answer key gives the answer.",
    ),
});

export type CardBatch = z.infer<typeof cardBatchSchema>;

// One card, checked on its own. A sixth tag or a malformed wrong option is
// repaired, because neither is a reason to lose a good question. Null means the
// question, answer or quote itself is unusable.
export function acceptCard(candidate: CandidateCard): GeneratedCard | null {
  const quiz = quizContentSchema.safeParse(candidate.quiz);
  const card = generatedCardSchema.safeParse({
    ...candidate,
    quiz: quiz.success ? quiz.data : null,
    topic: candidate.topic?.slice(0, 100) || null,
    tags: candidate.tags.filter((tag) => tag && tag.length <= 30).slice(0, 5),
  });
  return card.success ? card.data : null;
}

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

import { z } from 'zod';

// Blank when the notes give no reason. A multiple-choice item copied from the
// student's notes keeps its options even when nothing explains them; a guessed
// explanation would be an invented medical fact.
const explanationSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((text) => text === '' || text.length >= 10, {
    message: 'Leave the explanation blank or write at least 10 characters.',
  });

export const quizContentSchema = z.object({
  explanation: explanationSchema,
  distractors: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(1000),
        explanation: explanationSchema,
      }),
    )
    .length(3),
});
export type QuizContent = z.infer<typeof quizContentSchema>;
const normalize = (text: string) =>
  text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
export function validQuizContent(answer: string, quiz: QuizContent): boolean {
  return (
    quizContentSchema.safeParse(quiz).success &&
    new Set([answer, ...quiz.distractors.map((d) => d.text)].map(normalize))
      .size === 4
  );
}

// Feedback reads "why that option is wrong, then why the answer is right",
// skipping whichever the notes did not explain.
export function joinExplanations(...parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
}

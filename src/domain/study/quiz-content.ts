import { z } from 'zod';

export const quizContentSchema = z.object({
  explanation: z.string().trim().min(10).max(1000),
  distractors: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(1000),
        explanation: z.string().trim().min(10).max(1000),
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

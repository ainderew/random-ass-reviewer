import { generatedChoicesSchema } from '@/domain/study/card-schema';
import {
  validQuizContent,
  type QuizContent,
} from '@/domain/study/quiz-content';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { CHOICE_MAX_TOKENS, MODELS } from '@/server/llm/models';
import {
  CHOICE_GENERATION_SYSTEM,
  choiceGenerationUserText,
} from '@/server/llm/prompts/choice-generation';
import type { LlmProvider } from '@/server/llm/provider';
import {
  findCardWithPassage,
  setQuizIfEmpty,
} from '@/server/repositories/card';
import { assertWithinQuota, recordUsage } from './llm-usage';

// Three wrong options for one card that has none. The answer stays the
// source-checked one; only the alternatives are new, and they keep the card in
// review. The student sees them at once and can fix them in the card editor.
export async function makeChoices(input: {
  userId: string;
  cardId: string;
  provider: LlmProvider;
}): Promise<QuizContent> {
  const { userId, cardId, provider } = input;
  const found = await findCardWithPassage(db, { userId, cardId });
  if (!found) throw new AppError('NOT_FOUND', 'Card not found');
  const { card, passage } = found;
  if (card.quiz && validQuizContent(card.answer, card.quiz)) return card.quiz;

  // Same metering rules as card generation.
  if (provider.name === 'anthropic-api') await assertWithinQuota(userId);
  const { data, usage } = await provider.generateStructured({
    system: CHOICE_GENERATION_SYSTEM,
    userText: choiceGenerationUserText({
      question: card.question,
      answer: card.answer,
      passage,
    }),
    schema: generatedChoicesSchema,
    model: MODELS.cardGeneration,
    maxTokens: CHOICE_MAX_TOKENS,
  });
  if (provider.name !== 'local-cli')
    await recordUsage(userId, usage, MODELS.cardGeneration);

  if (!validQuizContent(card.answer, data)) {
    throw new AppError(
      'INVALID_STATE',
      'Those choices repeated the answer. Try again.',
    );
  }
  const saved = await setQuizIfEmpty(db, { userId, cardId, quiz: data });
  if (saved?.quiz) return saved.quiz;
  // Another tap or an edit set choices first. Theirs stand.
  const current = await findCardWithPassage(db, { userId, cardId });
  if (current?.card.quiz) return current.card.quiz;
  throw new AppError('NOT_FOUND', 'Card not found');
}

import type { Card } from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { deleteCard, updateCardText } from '@/server/repositories/card';

export async function editCard(input: {
  userId: string;
  cardId: string;
  question: string;
  answer: string;
}): Promise<Card> {
  const card = await updateCardText(db, input);
  if (!card) throw new AppError('NOT_FOUND', 'Card not found');
  return card;
}

export async function removeCard(input: {
  userId: string;
  cardId: string;
}): Promise<void> {
  const removed = await deleteCard(db, input);
  if (!removed) throw new AppError('NOT_FOUND', 'Card not found');
}

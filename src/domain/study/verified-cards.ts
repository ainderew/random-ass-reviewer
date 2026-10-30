import {
  acceptCard,
  type CandidateCard,
  type GeneratedCard,
} from './card-schema';
import { parseChoiceItems, restoreChoiceItem } from './choice-items';
import { mentionsNotes } from './source-reference';
import { quoteAppearsInSource } from './verify-quote';

// The student's own question is theirs to word, so only new cards are held to it.
function citesTheNotes(card: GeneratedCard): boolean {
  return mentionsNotes(card.question) || mentionsNotes(card.answer);
}

// What the model returned, reduced to what may be stored. The hallucination
// guard runs on the model's own quote, before anything is restored from the page.
export function verifiedCards(
  candidates: CandidateCard[],
  passage: string,
  keyLetters: Map<number, string>,
): GeneratedCard[] {
  const items = parseChoiceItems(passage);
  return candidates.flatMap((candidate) => {
    const card = acceptCard(candidate);
    if (!card || !quoteAppearsInSource(card.sourceQuote, passage)) return [];
    if (card.questionType !== 'own' && citesTheNotes(card)) return [];
    return [restoreChoiceItem(card, items, keyLetters)];
  });
}

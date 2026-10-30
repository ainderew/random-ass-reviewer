import { QUESTION_MAX, type GeneratedCard } from './card-schema';
import type { QuizContent } from './quiz-content';
import { normalizeForMatch } from './verify-quote';

// A numbered multiple-choice item can be read straight off the page, so its
// wording and its keyed answer are not left to the model. Running real handouts
// showed it rewording most stems, against decision 59, and once picking the
// option below the keyed one. The quote check passes both, because the quote
// really is on the page. The model still classifies the card.

export interface ChoiceItem {
  number: number;
  stem: string;
  options: Array<{ letter: string; text: string }>;
}

const ITEM = /^(\d{1,3})[.)]\s+(\S.*)$/;
const OPTION = /^([a-e])[.)]\s+(\S.*)$/i;
const MIN_OPTIONS = 2;
// These stems read as nonsense alone, so the model's named version is kept.
const NEEDS_ITS_OPTIONS = /\b(?:which|all|none) of (?:the following|these)\b/i;

export function parseChoiceItems(passage: string): ChoiceItem[] {
  const items: ChoiceItem[] = [];
  let current: ChoiceItem | null = null;
  for (const raw of passage.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const item = line.match(ITEM);
    const option = line.match(OPTION);
    if (item) {
      current = { number: Number(item[1]), stem: item[2]!, options: [] };
      items.push(current);
    } else if (option && current) {
      const letter = option[1]!.toUpperCase();
      current.options.push({ letter, text: option[2]! });
    } else if (current && current.options.length === 0) {
      current.stem += ` ${line}`;
    }
  }
  return items.filter((item) => item.options.length >= MIN_OPTIONS);
}

function itemFor(card: GeneratedCard, items: ChoiceItem[]): ChoiceItem | null {
  const quote = normalizeForMatch(card.sourceQuote);
  const opening = normalizeForMatch(card.sourceQuote.split('\n', 1)[0] ?? '');
  const found = items.find((item) => {
    const stem = normalizeForMatch(item.stem);
    return (
      quote.includes(stem) || (opening.length >= 10 && stem.includes(opening))
    );
  });
  return found ?? null;
}

// A wrapped option is only read up to its line break, so an answer that runs on
// from the parsed text is the same option, not a different one.
function sameOption(answer: string, optionText: string): boolean {
  const said = normalizeForMatch(answer).replace(/\.$/, '');
  const option = normalizeForMatch(optionText).replace(/\.$/, '');
  return said === option || said.startsWith(`${option} `);
}

function choicesFrom(
  item: ChoiceItem,
  answerLetter: string,
): QuizContent | null {
  const others = item.options.filter((o) => o.letter !== answerLetter);
  if (others.length < 3) return null;
  return {
    explanation: '',
    distractors: others
      .slice(0, 3)
      .map((option) => ({ text: option.text, explanation: '' })),
  };
}

export function restoreChoiceItem(
  card: GeneratedCard,
  items: ChoiceItem[],
  keyLetters: Map<number, string>,
): GeneratedCard {
  if (card.questionType !== 'own') return card;
  const item = itemFor(card, items);
  if (!item) return card;

  const standsAlone =
    !NEEDS_ITS_OPTIONS.test(item.stem) && item.stem.length <= QUESTION_MAX;
  const restored = {
    ...card,
    question: standsAlone ? item.stem : card.question,
  };
  const letter = keyLetters.get(item.number);
  const keyed = item.options.find((option) => option.letter === letter);
  if (!letter || !keyed) return restored;
  // Explanations written for a different answer would be wrong, so a corrected
  // card keeps the page's options and leaves them blank (decision 60).
  return sameOption(card.answer, keyed.text)
    ? { ...restored, quiz: card.quiz ?? choicesFrom(item, letter) }
    : { ...restored, answer: keyed.text, quiz: choicesFrom(item, letter) };
}

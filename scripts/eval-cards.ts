import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  cardBatchSchema,
  type GeneratedCard,
} from '@/domain/study/card-schema';
import { chunkNotes } from '@/domain/study/chunking';
import {
  passageContexts,
  type PassageContext,
} from '@/domain/study/passage-context';
import { verifiedCards } from '@/domain/study/verified-cards';
import { env } from '@/lib/env';
import { ClaudeCodeProvider } from '@/server/llm/claude-code-provider';
import { LocalCliProvider } from '@/server/llm/local-cli-provider';
import { CARD_MAX_TOKENS, MODELS } from '@/server/llm/models';
import type { LlmProvider } from '@/server/llm/provider';
import {
  CARD_GENERATION_SYSTEM,
  cardGenerationUserText,
} from '@/server/llm/prompts/card-generation';

// Runs sample notes through the real prompt with no database, so a prompt
// change can be read as cards before it ships. Uses the Claude login behind
// LLM_PROVIDER, so run `claude /login` first if every chunk fails.
//   pnpm eval:cards <out-dir> [notes-dir]
const NOTES_DIR = 'scripts/eval-notes';
const CONCURRENCY = 3;

interface ChunkResult {
  ordinal: number;
  chars: number;
  kept: GeneratedCard[];
  rejected: number;
  unanswered: number;
  seconds: number;
  error?: string;
}

async function runChunk(
  provider: LlmProvider,
  input: {
    title: string;
    text: string;
    ordinal: number;
    context: PassageContext;
  },
): Promise<ChunkResult> {
  const { title, text, ordinal, context } = input;
  const startedAt = Date.now();
  const elapsed = () => Math.round((Date.now() - startedAt) / 1000);
  const base = { ordinal, chars: text.length };
  try {
    const { data } = await provider.generateStructured({
      system: CARD_GENERATION_SYSTEM,
      userText: cardGenerationUserText({ title, context, passage: text }),
      schema: cardBatchSchema,
      model: MODELS.cardGeneration,
      maxTokens: CARD_MAX_TOKENS,
    });
    const kept = verifiedCards(data.cards, text, context.keyLetters);
    return {
      ...base,
      kept,
      rejected: data.cards.length - kept.length,
      unanswered: data.unanswered,
      seconds: elapsed(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      kept: [],
      rejected: 0,
      unanswered: 0,
      seconds: elapsed(),
      error: message,
    };
  }
}

async function mapLimited<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function renderCard(card: GeneratedCard): string {
  const options = card.quiz
    ? `\n  - options: ${card.quiz.distractors.map((d) => d.text).join(' / ')}`
    : '';
  return `- **[${card.questionType}, ${card.difficulty}]** ${card.question}\n  - ${card.answer}\n  - > ${card.sourceQuote}${options}`;
}

function renderNote(name: string, results: ChunkResult[]): string {
  const sections = results.map((result) => {
    const head = `## Chunk ${result.ordinal} (${result.chars} chars, ${result.kept.length} kept, ${result.rejected} rejected, ${result.unanswered} unanswered, ${result.seconds}s)`;
    const failure = result.error ? [`**Failed:** ${result.error}`] : [];
    return [head, ...failure, ...result.kept.map(renderCard)].join('\n');
  });
  return [`# ${name}`, ...sections].join('\n\n');
}

function summarize(name: string, results: ChunkResult[]): string {
  const kept = results.flatMap((result) => result.kept);
  const total = (pick: (result: ChunkResult) => number) =>
    results.reduce((sum, result) => sum + pick(result), 0);
  const types = Object.entries(
    Object.groupBy(kept, (card) => card.questionType),
  ).map(([type, cards]) => `${type} ${cards?.length}`);
  const perChunk = results.map((result) => result.kept.length).join('+');
  const failures = results.flatMap((result) =>
    result.error ? [`chunk ${result.ordinal}: ${result.error}`] : [],
  );
  const slowest = Math.max(...results.map((result) => result.seconds));
  return `${name}: ${kept.length} cards (${perChunk}), ${failures.length} failed, ${total((r) => r.rejected)} rejected, ${total((r) => r.unanswered)} unanswered, slowest ${slowest}s, ${types.join(', ')}${failures.map((failure) => `\n  ${failure}`).join('')}`;
}

async function main(): Promise<void> {
  const [outDir, notesDir = NOTES_DIR] = process.argv.slice(2);
  if (!outDir) throw new Error('Usage: pnpm eval:cards <out-dir> [notes-dir]');
  await mkdir(outDir, { recursive: true });

  const provider =
    env.LLM_PROVIDER === 'claude-code'
      ? new ClaudeCodeProvider()
      : new LocalCliProvider();
  const files = (await readdir(notesDir)).sort();
  const summaries = await mapLimited(files, 1, async (file) => {
    const name = path.parse(file).name;
    const chunks = chunkNotes(
      await readFile(path.join(notesDir, file), 'utf8'),
    );
    const contexts = passageContexts(chunks);
    const results = await mapLimited(chunks, CONCURRENCY, (chunk) =>
      runChunk(provider, {
        title: name,
        text: chunk.text,
        ordinal: chunk.ordinal,
        context: contexts[chunk.ordinal]!,
      }),
    );
    await writeFile(path.join(outDir, `${name}.md`), renderNote(name, results));
    await writeFile(
      path.join(outDir, `${name}.json`),
      JSON.stringify(results, null, 2),
    );
    return summarize(name, results);
  });
  console.log(`${MODELS.cardGeneration} at ${env.ANTHROPIC_EFFORT_CARDS}`);
  console.log(summaries.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

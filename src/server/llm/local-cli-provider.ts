import { spawn } from 'node:child_process';
import { z } from 'zod';
import { env } from '@/lib/env';
import { AppError } from '@/server/errors';
import type { LlmProvider } from './provider';
import type {
  ImageRequest,
  LlmResult,
  StructuredRequest,
  SystemBlock,
} from './types';

const cliResultSchema = z.object({
  result: z.string(),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
    })
    .partial()
    .optional(),
});

// The CLI has no structured output mode, so the model may wrap the JSON in a
// fence or a sentence. Take the outermost object; validation happens after.
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidates = [trimmed, fenced?.[1]];
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start)
    candidates.push(trimmed.slice(start, end + 1));
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next shape
    }
  }
  throw new AppError(
    'VALIDATION',
    'LocalCliProvider: the model did not return JSON.',
  );
}

function buildPrompt(
  system: SystemBlock[],
  user: string,
  schema: z.ZodType,
): string {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  return [
    ...system.map((b) => b.text),
    '',
    'Respond with a single JSON object and nothing else. It must match this JSON schema exactly:',
    jsonSchema,
    '',
    '---',
    user,
  ].join('\n');
}

// Development only. Shells out to the local `claude` CLI, which is backed by
// the developer's own subscription. Structured output is not available this
// way, so it asks for JSON and validates with the same schema. Less reliable
// than the API path by design; validate prompt changes against the API.
export class LocalCliProvider implements LlmProvider {
  readonly name = 'local-cli' as const;

  constructor(nodeEnv: string = env.NODE_ENV) {
    // Belt and braces with the env refinement: a ToS boundary, not a flag.
    if (nodeEnv === 'production') {
      throw new Error('LocalCliProvider must not be constructed in production');
    }
  }

  async generateStructured<T>(
    req: StructuredRequest<T>,
  ): Promise<LlmResult<T>> {
    const prompt = buildPrompt(req.system, req.userText, req.schema);
    return this.invoke(prompt, req.schema);
  }

  async generateFromImage<T>(req: ImageRequest<T>): Promise<LlmResult<T>> {
    // The CLI takes no inline images. Keep dev honest instead of pretending.
    void req;
    throw new AppError(
      'VALIDATION',
      'Image transcription needs the API provider. Add a key.',
    );
  }

  // Rough, and only used for chunk sizing on this path, never for billing.
  async countTokens(req: { model: string; text: string }): Promise<number> {
    return Math.ceil(req.text.length / 4);
  }

  private async invoke<T>(
    prompt: string,
    schema: z.ZodType<T>,
  ): Promise<LlmResult<T>> {
    const stdout = await runClaude(prompt);
    const envelope = cliResultSchema.safeParse(JSON.parse(stdout));
    if (!envelope.success)
      throw new AppError(
        'VALIDATION',
        'LocalCliProvider: unexpected CLI output.',
      );
    const parsed = extractJson(envelope.data.result);
    const data = schema.safeParse(parsed);
    if (!data.success)
      throw new AppError(
        'VALIDATION',
        'LocalCliProvider: JSON did not match the schema.',
      );
    const usage = envelope.data.usage ?? {};
    return {
      data: data.data,
      usage: {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
      },
    };
  }
}

// Prompt goes over stdin. No tools: this is a plain completion, not an agent.
function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'claude',
      [
        '-p',
        '--output-format',
        'json',
        '--tools',
        '',
        '--no-session-persistence',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'], timeout: 180_000 },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (d: string) => (stdout += d));
    child.stderr.setEncoding('utf8').on('data', (d: string) => (stderr += d));
    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(
        new AppError(
          'INVALID_STATE',
          error.code === 'ENOENT'
            ? 'LocalCliProvider: `claude` CLI is not installed.'
            : `LocalCliProvider: could not start claude (${error.message}).`,
        ),
      );
    });
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(
        new AppError(
          'INVALID_STATE',
          `LocalCliProvider: claude exited ${code}. ${stderr.slice(0, 200)}`,
        ),
      );
    });
    child.stdin.end(prompt);
  });
}

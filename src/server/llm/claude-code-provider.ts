import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { env } from '@/lib/env';
import { AppError } from '@/server/errors';
import { extractJson } from './local-cli-provider';
import type { LlmProvider } from './provider';
import type {
  ImageRequest,
  LlmResult,
  StructuredRequest,
  SystemBlock,
  TokenUsage,
} from './types';

const TIMEOUT_MS = 180_000;

// The owner's own Claude subscription, through the Agent SDK, the same way
// the tracker app runs. Every call is a hermetic single turn: no tools, no
// filesystem settings, no session persistence, thinking off. The SDK reads
// CLAUDE_CODE_OAUTH_TOKEN from the environment (or the local login in dev).
//
// Refused in production without an explicit opt-in. A subscription serving
// people other than its owner is the owner's decision, made in the env file,
// not something the code does quietly.
export class ClaudeCodeProvider implements LlmProvider {
  readonly name = 'claude-code' as const;

  constructor(
    nodeEnv: string = env.NODE_ENV,
    allowInProduction: boolean = env.ALLOW_CLAUDE_CODE_IN_PRODUCTION,
  ) {
    if (nodeEnv === 'production' && !allowInProduction) {
      throw new Error(
        'ClaudeCodeProvider needs ALLOW_CLAUDE_CODE_IN_PRODUCTION=true in production',
      );
    }
  }

  async generateStructured<T>(
    req: StructuredRequest<T>,
  ): Promise<LlmResult<T>> {
    return this.run(req.userText, req.system, req.schema, req.model);
  }

  async generateFromImage<T>(req: ImageRequest<T>): Promise<LlmResult<T>> {
    const prompt = async function* (): AsyncGenerator<SDKUserMessage> {
      yield {
        type: 'user',
        parent_tool_use_id: null,
        message: {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: req.mediaType,
                data: req.imageBase64,
              },
            },
            { type: 'text', text: req.prompt },
          ],
        },
      };
    };
    return this.run(prompt(), req.system, req.schema, req.model);
  }

  // Rough, and only used for chunk sizing on this path, never for billing.
  async countTokens(req: { model: string; text: string }): Promise<number> {
    return Math.ceil(req.text.length / 4);
  }

  private async run<T>(
    prompt: string | AsyncIterable<SDKUserMessage>,
    system: SystemBlock[],
    schema: z.ZodType<T>,
    model: string,
  ): Promise<LlmResult<T>> {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), TIMEOUT_MS);
    try {
      // Loaded on first use: the SDK is ESM-only and spawns a binary, neither
      // of which belongs in module load, in tests, or in the standalone trace.
      const { query } = await import('@anthropic-ai/claude-agent-sdk');
      const stream = query({
        prompt,
        options: {
          model,
          systemPrompt: system.map((b) => b.text).join('\n\n'),
          tools: [],
          allowedTools: [],
          maxTurns: 1,
          settingSources: [],
          persistSession: false,
          thinking: { type: 'disabled' },
          outputFormat: { type: 'json_schema', schema: draft7(schema) },
          abortController,
        },
      });
      for await (const message of stream) {
        if (message.type !== 'result') continue;
        if (message.subtype !== 'success') {
          throw classify(
            'errors' in message && Array.isArray(message.errors)
              ? message.errors.join('; ')
              : message.subtype,
          );
        }
        const raw = message.structured_output ?? extractJson(message.result);
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          throw new AppError(
            'VALIDATION',
            'The model returned an unusable response.',
          );
        }
        return { data: parsed.data, usage: toUsage(message.usage) };
      }
      throw new AppError(
        'INVALID_STATE',
        'The model stream ended without a result.',
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (abortController.signal.aborted) {
        throw new AppError(
          'INVALID_STATE',
          'The model took too long. Try again.',
        );
      }
      throw classify(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  }
}

// The SDK validates with a draft-07 validator that rejects the 2020-12
// `$schema` header Zod emits by default.
function draft7(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<
    string,
    unknown
  >;
  delete json['$schema'];
  return json;
}

function toUsage(usage: {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}): TokenUsage {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  };
}

// The subscription's own limits read as rate limits; everything else stops
// the run with a plain message. The raw text stays in the server log.
function classify(detail: string): AppError {
  console.error('[claude-code]', detail);
  if (/rate|limit|too many|overloaded|429/i.test(detail)) {
    return new AppError(
      'RATE_LIMITED',
      'Claude is busy or at its usage limit. Try again later.',
    );
  }
  if (/auth|token|401|403|login|credential/i.test(detail)) {
    return new AppError(
      'VALIDATION',
      'The Claude subscription token was refused.',
    );
  }
  return new AppError('INVALID_STATE', 'The model request failed.');
}

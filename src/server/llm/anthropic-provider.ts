import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AppError } from '@/server/errors';
import type { LlmProvider } from './provider';
import type {
  ImageRequest,
  LlmProviderName,
  LlmResult,
  StructuredRequest,
  SystemBlock,
  TokenUsage,
} from './types';

function toSystem(blocks: SystemBlock[]): Anthropic.TextBlockParam[] {
  return blocks.map((block) => ({
    type: 'text',
    text: block.text,
    ...(block.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
}

function mapUsage(usage: Anthropic.Usage): TokenUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  };
}

// Typed exceptions, most specific first. Never string-match an error.
function translate(error: unknown): never {
  if (error instanceof AppError) throw error;
  if (error instanceof Anthropic.RateLimitError) {
    throw new AppError('RATE_LIMITED', 'Busy right now. Try again shortly.');
  }
  if (error instanceof Anthropic.AuthenticationError) {
    throw new AppError(
      'VALIDATION',
      "That key didn't work. Check it and try again.",
    );
  }
  if (error instanceof Anthropic.APIError) {
    throw new AppError(
      'INVALID_STATE',
      `The model request failed (${error.status ?? 'network'}).`,
    );
  }
  throw error;
}

// Production path. Structured output through messages.parse so the response
// arrives validated; a frozen system prefix carries the cache breakpoint.
export class AnthropicApiProvider implements LlmProvider {
  readonly name: LlmProviderName;
  private readonly client: Anthropic;

  constructor(apiKey: string, name: LlmProviderName = 'anthropic-api') {
    this.name = name;
    this.client = new Anthropic({ apiKey });
  }

  async generateStructured<T>(
    req: StructuredRequest<T>,
  ): Promise<LlmResult<T>> {
    try {
      const response = await this.client.messages.parse({
        model: req.model,
        max_tokens: req.maxTokens,
        system: toSystem(req.system),
        messages: [{ role: 'user', content: req.userText }],
        output_config: { format: zodOutputFormat(req.schema) },
      });
      return finish(response);
    } catch (error) {
      return translate(error);
    }
  }

  async generateFromImage<T>(req: ImageRequest<T>): Promise<LlmResult<T>> {
    try {
      const response = await this.client.messages.parse({
        model: req.model,
        max_tokens: req.maxTokens,
        system: toSystem(req.system),
        messages: [
          {
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
        ],
        output_config: { format: zodOutputFormat(req.schema) },
      });
      return finish(response);
    } catch (error) {
      return translate(error);
    }
  }

  // The real tokenizer. Never estimate with tiktoken or a character ratio.
  async countTokens(req: { model: string; text: string }): Promise<number> {
    try {
      const count = await this.client.messages.countTokens({
        model: req.model,
        messages: [{ role: 'user', content: req.text }],
      });
      return count.input_tokens;
    } catch (error) {
      return translate(error);
    }
  }
}

// A refusal comes back as HTTP 200 with no usable content. Check it first.
function finish<T>(response: {
  stop_reason: Anthropic.Message['stop_reason'];
  parsed_output: T | null | undefined;
  usage: Anthropic.Usage;
}): LlmResult<T> {
  if (response.stop_reason === 'refusal') {
    throw new AppError('INVALID_STATE', 'The model declined this passage.');
  }
  if (response.parsed_output === null || response.parsed_output === undefined) {
    throw new AppError(
      'VALIDATION',
      'The model returned an unusable response.',
    );
  }
  return { data: response.parsed_output, usage: mapUsage(response.usage) };
}

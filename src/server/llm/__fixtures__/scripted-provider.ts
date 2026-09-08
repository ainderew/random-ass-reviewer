import { AppError } from '@/server/errors';
import type { LlmProvider } from '@/server/llm/provider';
import type {
  ImageRequest,
  LlmProviderName,
  LlmResult,
  StructuredRequest,
  TokenUsage,
} from '@/server/llm/types';

export interface ScriptStep {
  // Returned as the parsed structured output, validated by the request schema.
  output?: unknown;
  // Thrown instead of returning.
  error?: Error;
  usage?: Partial<TokenUsage>;
}

const DEFAULT_USAGE: TokenUsage = {
  inputTokens: 900,
  outputTokens: 300,
  cacheCreationInputTokens: 600,
  cacheReadInputTokens: 0,
};

// The one fake in the suite. The provider is the external boundary and the
// interface exists precisely so tests never touch the network. Steps play in
// order; the last one repeats. Every call is recorded for shape assertions.
export class ScriptedProvider implements LlmProvider {
  readonly name: LlmProviderName;
  readonly calls: Array<StructuredRequest<unknown> | ImageRequest<unknown>> =
    [];
  private readonly steps: ScriptStep[];

  constructor(steps: ScriptStep[], name: LlmProviderName = 'anthropic-api') {
    this.steps = steps;
    this.name = name;
  }

  static refusal(): Error {
    return new AppError('INVALID_STATE', 'The model declined this passage.');
  }

  static rateLimited(): Error {
    return new AppError('RATE_LIMITED', 'Busy right now. Try again shortly.');
  }

  static unusable(): Error {
    return new AppError(
      'VALIDATION',
      'The model returned an unusable response.',
    );
  }

  private step(): ScriptStep {
    const index = Math.min(this.calls.length - 1, this.steps.length - 1);
    return this.steps[index] ?? {};
  }

  async generateStructured<T>(
    req: StructuredRequest<T>,
  ): Promise<LlmResult<T>> {
    this.calls.push(req);
    const step = this.step();
    if (step.error) throw step.error;
    return {
      data: req.schema.parse(step.output ?? { cards: [] }),
      usage: { ...DEFAULT_USAGE, ...step.usage },
    };
  }

  async generateFromImage<T>(req: ImageRequest<T>): Promise<LlmResult<T>> {
    this.calls.push(req);
    const step = this.step();
    if (step.error) throw step.error;
    return {
      data: req.schema.parse(step.output ?? { text: '' }),
      usage: { ...DEFAULT_USAGE, ...step.usage },
    };
  }

  async countTokens(req: { model: string; text: string }): Promise<number> {
    return Math.ceil(req.text.length / 4);
  }
}

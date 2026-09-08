import type { z } from 'zod';

export type LlmProviderName =
  'anthropic-api' | 'byok' | 'local-cli' | 'claude-code' | 'fake';

export interface SystemBlock {
  text: string;
  // Marks the end of the cacheable prefix. Put it on the last stable block.
  cache?: boolean;
}

// All four fields, separately. Cache reads and writes are priced differently.
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface StructuredRequest<T> {
  system: SystemBlock[];
  userText: string;
  schema: z.ZodType<T>;
  model: string;
  maxTokens: number;
}

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp';

export interface ImageRequest<T> {
  system: SystemBlock[];
  imageBase64: string;
  mediaType: ImageMediaType;
  prompt: string;
  schema: z.ZodType<T>;
  model: string;
  maxTokens: number;
}

export interface LlmResult<T> {
  data: T;
  usage: TokenUsage;
}

import type {
  ImageRequest,
  LlmProviderName,
  LlmResult,
  StructuredRequest,
} from './types';

// The one abstraction every service depends on. Narrow on purpose: if all
// three implementations cannot satisfy a method, it does not belong here.
export interface LlmProvider {
  readonly name: LlmProviderName;
  generateStructured<T>(req: StructuredRequest<T>): Promise<LlmResult<T>>;
  generateFromImage<T>(req: ImageRequest<T>): Promise<LlmResult<T>>;
  countTokens(req: { model: string; text: string }): Promise<number>;
}

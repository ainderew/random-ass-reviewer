import { transcriptionSchema } from '@/domain/study/card-schema';
import { normalizeContent, titleFromText } from '@/domain/study/normalize';
import { AppError } from '@/server/errors';
import { MODELS, OCR_MAX_TOKENS } from '@/server/llm/models';
import {
  TRANSCRIPTION_PROMPT,
  TRANSCRIPTION_SYSTEM,
} from '@/server/llm/prompts/transcription';
import type { LlmProvider } from '@/server/llm/provider';
import type { ImageMediaType } from '@/server/llm/types';
import { recordUsage } from '../llm-usage';
import type { Ingested } from './text';

export const MAX_IMAGES = 5;

// Transcription first, cards later in the normal path. Two steps on purpose.
export async function ingestImages(input: {
  userId: string;
  provider: LlmProvider;
  images: Array<{ base64: string; mediaType: ImageMediaType }>;
}): Promise<Ingested> {
  if (input.images.length === 0)
    throw new AppError('VALIDATION', 'No images to read.');
  if (input.images.length > MAX_IMAGES) {
    throw new AppError('VALIDATION', `Up to ${MAX_IMAGES} photos per upload.`);
  }
  const pages: string[] = [];
  for (const image of input.images) {
    const { data, usage } = await input.provider.generateFromImage({
      system: TRANSCRIPTION_SYSTEM,
      imageBase64: image.base64,
      mediaType: image.mediaType,
      prompt: TRANSCRIPTION_PROMPT,
      schema: transcriptionSchema,
      model: MODELS.handwritingOcr,
      maxTokens: OCR_MAX_TOKENS,
    });
    await recordUsage(input.userId, usage, MODELS.handwritingOcr);
    if (data.text.trim()) pages.push(data.text.trim());
  }
  const text = normalizeContent(pages.join('\n\n'));
  if (!text)
    throw new AppError(
      'VALIDATION',
      "We couldn't read any notes in those photos.",
    );
  return { title: titleFromText(text, 'Photographed notes'), text };
}

import { normalizeContent, titleFromText } from '@/domain/study/normalize';

export interface Ingested {
  title: string;
  text: string;
}

export function ingestText(input: {
  text: string;
  title?: string;
  filename?: string;
}): Ingested {
  const text = normalizeContent(input.text);
  const fromFile = input.filename?.replace(/\.(md|markdown|txt)$/i, '');
  return {
    title: input.title?.trim() || fromFile || titleFromText(text),
    text,
  };
}

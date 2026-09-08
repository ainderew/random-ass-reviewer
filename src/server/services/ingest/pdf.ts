import { extractText, getDocumentProxy } from 'unpdf';
import { normalizeContent } from '@/domain/study/normalize';
import { AppError } from '@/server/errors';
import type { Ingested } from './text';

export const MAX_PDF_PAGES = 20;
// A multi-page PDF with almost no text is a scan. Say so; OCR noise makes bad cards.
const MIN_CHARS_PER_PAGE = 100;

export async function ingestPdf(input: {
  bytes: Uint8Array;
  filename?: string;
}): Promise<Ingested> {
  let pageCount = 0;
  let text = '';
  try {
    const pdf = await getDocumentProxy(input.bytes);
    pageCount = pdf.numPages;
    if (pageCount > MAX_PDF_PAGES) {
      throw new AppError(
        'VALIDATION',
        `PDFs are limited to ${MAX_PDF_PAGES} pages.`,
      );
    }
    const extracted = await extractText(pdf, { mergePages: false });
    text = extracted.text.join('\n\n');
  } catch (error) {
    if (error instanceof AppError) throw error;
    // The cause stays in the server log; the user gets a plain sentence.
    console.warn('[pdf] unreadable upload', error);
    throw new AppError('VALIDATION', "We couldn't read this PDF.");
  }

  const normalized = normalizeContent(text);
  if (
    pageCount > 0 &&
    normalized.length < MIN_CHARS_PER_PAGE * Math.min(pageCount, 3)
  ) {
    throw new AppError(
      'VALIDATION',
      'This PDF looks scanned. Upload photos of the pages instead and we will transcribe them.',
    );
  }
  return {
    title: input.filename?.replace(/\.pdf$/i, '') || 'PDF notes',
    text: normalized,
  };
}

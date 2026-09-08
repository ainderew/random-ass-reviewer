import { after } from 'next/server';
import { createNoteRequestSchema, type NoteKind } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { AppError } from '@/server/errors';
import { getProviderForUser } from '@/server/llm/factory';
import type { ImageMediaType } from '@/server/llm/types';
import { requireUserId } from '@/server/require-user';
import { assertRateLimit } from '@/server/services/rate-limit';
import { ingestImages, MAX_IMAGES } from '@/server/services/ingest/image';
import { ingestPdf } from '@/server/services/ingest/pdf';
import { ingestText } from '@/server/services/ingest/text';
import {
  createNoteSource,
  listNotes,
  runGeneration,
} from '@/server/services/notes';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set<string>(['image/png', 'image/jpeg', 'image/webp']);
const TEXT_TYPES = new Set<string>(['text/plain', 'text/markdown']);

export const GET = handleRoute(async () =>
  ok(await listNotes(await requireUserId())),
);

// Limits are enforced here, not in the file input. curl is not a file input.
export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  await assertRateLimit(userId, 'notes:create');
  const provider = await getProviderForUser(userId);
  const contentType = req.headers.get('content-type') ?? '';

  let kind: NoteKind;
  let ingested: { title: string; text: string };

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const files = form
      .getAll('files')
      .filter((f): f is File => f instanceof File);
    if (files.length === 0)
      throw new AppError('VALIDATION', 'Choose a file first.');
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES)
        throw new AppError('VALIDATION', 'Files must be under 10MB.');
    }
    const first = files[0]!;
    const isText =
      TEXT_TYPES.has(first.type) || /\.(md|markdown|txt)$/i.test(first.name);
    if (first.type === 'application/pdf' || /\.pdf$/i.test(first.name)) {
      kind = 'pdf';
      ingested = await ingestPdf({
        bytes: new Uint8Array(await first.arrayBuffer()),
        filename: first.name,
      });
    } else if (isText) {
      kind = 'markdown';
      ingested = ingestText({ text: await first.text(), filename: first.name });
    } else if (files.every((f) => IMAGE_TYPES.has(f.type))) {
      if (files.length > MAX_IMAGES)
        throw new AppError(
          'VALIDATION',
          `Up to ${MAX_IMAGES} photos per upload.`,
        );
      kind = 'image';
      ingested = await ingestImages({
        userId,
        provider,
        images: await Promise.all(
          files.map(async (f) => ({
            base64: Buffer.from(await f.arrayBuffer()).toString('base64'),
            mediaType: f.type as ImageMediaType,
          })),
        ),
      });
    } else {
      throw new AppError(
        'VALIDATION',
        'We support PDF, Markdown, text, and photos.',
      );
    }
  } else {
    const body = createNoteRequestSchema.parse(await req.json());
    kind = 'paste';
    ingested = ingestText({ text: body.text, title: body.title });
  }

  const created = await createNoteSource({ userId, kind, ...ingested });
  if (!created.deduplicated) {
    // Runs after the response is sent; the client polls /status.
    after(() =>
      runGeneration({ userId, sourceId: created.sourceId, provider }),
    );
  }
  return ok(
    { sourceId: created.sourceId, deduplicated: created.deduplicated },
    201,
  );
});

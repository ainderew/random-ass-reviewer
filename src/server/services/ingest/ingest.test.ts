import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { users } from '@/server/db/schema';
import { ScriptedProvider } from '@/server/llm/__fixtures__/scripted-provider';
import { createUserWithDefaults } from '../user-bootstrap';
import { ingestImages } from './image';
import { ingestPdf } from './pdf';
import { ingestText } from './text';
import { makePdf } from './__fixtures__/tiny-pdf';

describe('ingestion', () => {
  let userId = '';
  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `ingest-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('names pasted and uploaded text sensibly', () => {
    expect(ingestText({ text: '# Cell membranes\n\nbody' })).toEqual({
      title: 'Cell membranes',
      text: '# Cell membranes\n\nbody',
    });
    expect(ingestText({ text: 'body', filename: 'enzymes.md' }).title).toBe(
      'enzymes',
    );
    expect(ingestText({ text: 'body', title: '  Given  ' }).title).toBe(
      'Given',
    );
  });

  it('refuses bytes that are not a PDF with a plain message', async () => {
    await expect(
      ingestPdf({
        bytes: new TextEncoder().encode('not a pdf'),
        filename: 'x.pdf',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
      message: expect.stringMatching(/read this PDF/),
    });
  });

  it('transcribes photos page by page and refuses empty or too many', async () => {
    const provider = new ScriptedProvider([
      { output: { text: 'Page one text.' } },
      { output: { text: 'Page two text.' } },
    ]);
    const png = { base64: 'aGk=', mediaType: 'image/png' as const };
    const result = await ingestImages({
      userId,
      provider,
      images: [png, png],
    });
    expect(result.text).toBe('Page one text.\n\nPage two text.');
    expect(result.title).toBe('Page one text.');
    expect(provider.calls).toHaveLength(2);

    await expect(
      ingestImages({ userId, provider, images: [] }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    await expect(
      ingestImages({ userId, provider, images: Array(6).fill(png) }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    const blank = new ScriptedProvider([{ output: { text: '   ' } }]);
    await expect(
      ingestImages({ userId, provider: blank, images: [png] }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
});

describe('pdf ingestion', () => {
  const line = (n: number) =>
    `Page ${n}. The plasma membrane is a phospholipid bilayer whose heads face water and whose tails point inward. Cholesterol keeps it fluid when cold and stable when hot. Simple diffusion moves small nonpolar molecules such as oxygen straight through the bilayer without any carrier at all.`;

  it('extracts the text layer page by page and names the file', async () => {
    const result = await ingestPdf({
      bytes: makePdf([line(1), line(2)]),
      filename: 'cells.pdf',
    });
    expect(result.title).toBe('cells');
    expect(result.text).toContain('Page 1.');
    expect(result.text).toContain('Page 2.');
  });

  it('refuses more than twenty pages', async () => {
    await expect(
      ingestPdf({
        bytes: makePdf(Array.from({ length: 21 }, (_, i) => line(i))),
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
      message: expect.stringMatching(/20 pages/),
    });
  });

  it('calls a text-free PDF a scan and points at photo upload', async () => {
    await expect(
      ingestPdf({ bytes: makePdf(['', '', '']) }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
      message: expect.stringMatching(/scanned/),
    });
  });
});

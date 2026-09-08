import { closeDb } from '@/server/db';
import {
  advanceProgress,
  finishProgress,
  getProgress,
  startProgress,
} from './generation-progress';

describe('generation progress', () => {
  afterAll(() => closeDb());

  it('tracks a run in memory and reports finished with a message', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    startProgress(id, 3);
    advanceProgress(id, { cards: 4, rejected: 1 });
    advanceProgress(id, { failed: true });
    let status = await getProgress('u', id);
    expect(status).toMatchObject({
      totalChunks: 3,
      processedChunks: 2,
      failedChunks: 1,
      cardsCreated: 4,
      rejectedCards: 1,
      finished: false,
    });
    finishProgress(id, 'stopped');
    status = await getProgress('u', id);
    expect(status).toMatchObject({ finished: true, message: 'stopped' });
    // Unknown ids are ignored, never thrown on.
    advanceProgress('nope', { cards: 1 });
    finishProgress('nope');
  });

  it('falls back to the database for a source it never saw', async () => {
    const status = await getProgress(
      'u',
      '22222222-2222-4222-8222-222222222222',
    );
    expect(status).toMatchObject({
      totalChunks: 0,
      finished: true,
      message: null,
    });
  });
});

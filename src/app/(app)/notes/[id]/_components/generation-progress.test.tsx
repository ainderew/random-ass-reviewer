import { render, screen } from '@testing-library/react';
import type { GenerationStatus } from '@/domain/types';
import { GenerationProgress } from './generation-progress';

const status: GenerationStatus = {
  sourceId: 'source',
  totalChunks: 1,
  processedChunks: 1,
  failedChunks: 0,
  cardsCreated: 3,
  rejectedCards: 0,
  unansweredQuestions: 0,
  finished: true,
  message: null,
};

function show(unansweredQuestions: number) {
  render(
    <GenerationProgress
      status={{ ...status, unansweredQuestions }}
      onRetry={() => {}}
      retrying={false}
    />,
  );
}

describe('GenerationProgress', () => {
  it('says nothing about skipped questions when none were skipped', () => {
    show(0);
    expect(screen.queryByText(/no answer in your notes/)).toBeNull();
  });

  it('tells the student how many of their questions have no card', () => {
    show(7);
    expect(
      screen.getByText(/7 questions had no answer in your notes/),
    ).toBeInTheDocument();
  });

  it('reads correctly for one question', () => {
    show(1);
    expect(
      screen.getByText(/1 question had no answer in your notes, so it has/),
    ).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Card } from '@/domain/types';
import { initialCardState } from '@/domain/review/scheduler';
import { CardEditor } from './card-editor';
const card: Card = {
  id: 'c',
  userId: 'u',
  chunkId: 's',
  question: 'What is in the notes?',
  answer: 'The answer.',
  sourceQuote: 'The source passage.',
  tags: [],
  nextDueAt: new Date(),
  fsrsState: initialCardState(0),
  suspended: false,
  reviewStatus: 'draft',
  subject: null,
  topic: null,
  quiz: null,
};
it('requires an explicit check to approve, while allowing saving a draft', async () => {
  const onSave = jest.fn();
  render(
    <CardEditor
      card={card}
      busy={false}
      onSave={onSave}
      onCancel={jest.fn()}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({ reviewStatus: 'draft' }),
  );
  await userEvent.selectOptions(
    screen.getByLabelText('MTLE subject'),
    'hematology',
  );
  await userEvent.click(
    screen.getByRole('checkbox', { name: /I checked the answer/ }),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Save and approve' }),
  );
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({
      reviewStatus: 'approved',
      subject: 'hematology',
    }),
  );
});

import { render, screen } from '@testing-library/react';
import { AnswerVerdict, ChoiceButton, choiceState } from './answer-feedback';

describe('choiceState', () => {
  const states = (picked: number | null, correct: number | null) =>
    [0, 1, 2].map((index) => choiceState({ index, picked, correct }));

  it('waits, then marks the pick right and fades the rest', () => {
    expect(states(null, null)).toEqual(['idle', 'idle', 'idle']);
    expect(states(1, null)).toEqual(['idle', 'pending', 'idle']);
    expect(states(1, 1)).toEqual(['dim', 'right', 'dim']);
  });

  it('marks a wrong pick and lights up the right answer', () => {
    expect(states(0, 2)).toEqual(['wrong', 'dim', 'answer']);
  });
});

it('labels graded choices in words, not colour alone', () => {
  const { rerender } = render(
    <ChoiceButton index={0} state="idle" onPick={jest.fn()}>
      EDTA
    </ChoiceButton>,
  );
  expect(screen.getByRole('button', { name: 'EDTA' })).toBeInTheDocument();
  rerender(
    <ChoiceButton index={0} state="wrong" onPick={jest.fn()}>
      EDTA
    </ChoiceButton>,
  );
  expect(screen.getByRole('button')).toHaveTextContent('Your answer');
  rerender(
    <ChoiceButton index={0} state="answer" onPick={jest.fn()}>
      EDTA
    </ChoiceButton>,
  );
  expect(screen.getByRole('button')).toHaveTextContent('Correct answer');
});

it('says right or wrong in one word', () => {
  const { rerender } = render(<AnswerVerdict correct />);
  expect(screen.getByRole('status')).toHaveTextContent('Correct!');
  rerender(<AnswerVerdict correct={false} />);
  expect(screen.getByRole('status')).toHaveTextContent('Not quite');
});

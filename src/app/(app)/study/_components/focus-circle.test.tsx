import { render, screen } from '@testing-library/react';
import { FocusCircle } from './focus-circle';

jest.mock('./character-view', () => ({ CharacterView: () => null }));

const H = 3_600_000;

describe('FocusCircle', () => {
  it('starts as a bedroom desk and says what she is doing', () => {
    render(
      <FocusCircle
        progress={{ focusMs: 0, highGrades: 0, cardsRecalled: 0 }}
        mood="wandering"
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'At a bedroom desk. Up and about.',
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  it('names the room, the coat, and the car she has earned', () => {
    render(
      <FocusCircle
        progress={{ focusMs: 45 * H, highGrades: 12, cardsRecalled: 60 }}
        mood="away"
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'At a clinic, white coat on the hook, car outside. Looking up.',
    );
  });

  it('fills the ring toward the chosen length and marks the rungs', () => {
    render(
      <FocusCircle
        progress={{ focusMs: 0, highGrades: 0, cardsRecalled: 0 }}
        mood="studying"
        focusedMs={12.5 * 60_000}
        lengthMs={25 * 60_000}
      />,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    expect(screen.getByText('Counts now at 5 min')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { CareerScene } from './career-scene';

const H = 3_600_000;

describe('CareerScene', () => {
  it('starts as a bedroom desk in a hoodie and says so', () => {
    render(
      <CareerScene
        progress={{ focusMs: 0, highGrades: 0, cardsRecalled: 0 }}
        mood="studying"
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'in a hoodie, at a bedroom desk. Studying.',
    );
  });

  it('draws the room, the coat, and the car she has earned', () => {
    render(
      <CareerScene
        progress={{ focusMs: 45 * H, highGrades: 12, cardsRecalled: 60 }}
        mood="away"
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'in a white coat, at a clinic, car outside. Looking up.',
    );
  });
});

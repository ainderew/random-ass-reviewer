import { render, screen } from '@testing-library/react';
import { CareerScene } from './career-scene';

jest.mock('./character-view', () => ({ CharacterView: () => null }));

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
      'At a bedroom desk. Studying.',
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
      'At a clinic, white coat on the hook, car outside. Looking up.',
    );
  });
});

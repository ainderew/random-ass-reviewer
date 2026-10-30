import { act, fireEvent, render, screen } from '@testing-library/react';
import { IllustratedCat } from './illustrated-cat';
import type { StudySceneCanvasProps } from './study-scene-canvas';

const props = {
  mood: 'studying',
  reducedMotion: false,
  scene: { room: 'bedroom', items: new Set() },
} as StudySceneCanvasProps;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('petting responds and settles back to studying', () => {
  const { container } = render(<IllustratedCat {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pet the study cat' }));
  expect(screen.getByRole('status')).toHaveTextContent('Prrr');
  expect(container.firstChild).toHaveAttribute('data-writing', 'false');
  act(() => jest.advanceTimersByTime(1600));
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(container.firstChild).toHaveAttribute('data-writing', 'true');
});

test('resting and reduced motion remain available together', () => {
  const { container } = render(
    <IllustratedCat {...props} mood="resting" reducedMotion />,
  );
  expect(container.firstChild).toHaveAttribute('data-asleep', 'true');
  expect(container.firstChild).toHaveAttribute('data-reduced', 'true');
  expect(container.firstChild).toHaveAttribute('data-writing', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Pet the study cat' }));
  expect(screen.getByRole('status')).toHaveTextContent('Prrr');
});

test('new care cues react independently and finish', () => {
  const { rerender } = render(
    <IllustratedCat {...props} cue={{ id: 1, kind: 'treat', toy: null }} />,
  );
  expect(screen.getByRole('status')).toHaveTextContent(
    'Thank you for the treat',
  );
  act(() => jest.advanceTimersByTime(2400));
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  rerender(
    <IllustratedCat {...props} cue={{ id: 2, kind: 'brush', toy: null }} />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('That feels lovely');
});

import { fireEvent, render, screen } from '@testing-library/react';
import { tapFeedback } from '@/lib/tap-feedback';

const vibrate = jest.fn();
const originalVibrate = navigator.vibrate;
const originalMatchMedia = window.matchMedia;
beforeEach(() => {
  vibrate.mockReset();
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    value: vibrate,
  });
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});
afterEach(() => {
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    value: originalVibrate,
  });
  window.matchMedia = originalMatchMedia;
});

function Controls({ action = jest.fn() }: { action?: () => void }) {
  return (
    <div onClickCapture={tapFeedback}>
      <button onClick={action}>Go</button>
      <button aria-disabled="true">Locked</button>
      <p>Plain text</p>
    </div>
  );
}

test('only enabled controls pulse', () => {
  render(<Controls />);
  fireEvent.click(screen.getByText('Plain text'));
  fireEvent.click(screen.getByRole('button', { name: 'Locked' }));
  expect(vibrate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Go' }));
  expect(vibrate).toHaveBeenCalledWith(8);
  expect(vibrate).toHaveBeenCalledTimes(1);
});

test('respects reduced motion', () => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });
  render(<Controls />);
  fireEvent.click(screen.getByRole('button', { name: 'Go' }));
  expect(vibrate).not.toHaveBeenCalled();
});

test('unsupported vibration never prevents the action', () => {
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    value: undefined,
  });
  const action = jest.fn();
  render(<Controls action={action} />);
  fireEvent.click(screen.getByRole('button', { name: 'Go' }));
  expect(action).toHaveBeenCalledTimes(1);
});

import { act, render, screen } from '@testing-library/react';
import { ConnectionStatus } from './connection-status';

describe('ConnectionStatus', () => {
  it('shows a banner when the browser goes offline and clears it on return', () => {
    render(<ConnectionStatus />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

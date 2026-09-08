import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SegmentError from '@/app/(app)/review/error';

describe('segment error boundary', () => {
  it('shows a friendly message and the digest, never error.message', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const reset = jest.fn();
    const error = Object.assign(
      new Error('postgres://user:secret@host/db failed'),
      {
        digest: 'abc123',
      },
    );
    render(<SegmentError error={error} reset={reset} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The review queue did not load',
    );
    expect(screen.getByText(/Reference abc123/)).toBeInTheDocument();
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders its label and responds to a click', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Start session</Button>);

    await userEvent.click(
      screen.getByRole('button', { name: 'Start session' }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('does not fire when disabled', async () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} disabled>
        Start session
      </Button>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Start session' }),
    );

    expect(onClick).not.toHaveBeenCalled();
  });
});

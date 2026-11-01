import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreakTracker } from './streak-tracker';

const streak = {
  days: 6,
  todayDone: false,
  freezesRemaining: 2,
  freezePending: false,
  nextMilestone: 7,
  minimumMinutes: 5,
};
it('shows one next milestone and keeps explanations folded away', async () => {
  const user = userEvent.setup();
  render(<StreakTracker streak={streak} />);
  await user.click(screen.getByText('6-day focus streak'));
  expect(screen.getByText('Next: 7 days')).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '6');
  expect(screen.queryByText(/Insight|island items/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Start focusing' })).toHaveAttribute(
    'href',
    '/focus',
  );
});
it('shows completion without asking for another session', async () => {
  const user = userEvent.setup();
  render(<StreakTracker streak={{ ...streak, todayDone: true }} />);
  await user.click(screen.getByText('6-day focus streak'));
  expect(screen.getByText('Done today')).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Start focusing' }),
  ).not.toBeInTheDocument();
});

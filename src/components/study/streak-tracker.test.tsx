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
it('lets the student explore milestones without changing earned progress', async () => {
  const user = userEvent.setup();
  render(<StreakTracker streak={streak} />);
  await user.click(screen.getByText('6-day focus streak'));
  expect(screen.getByText('1 more day')).toBeVisible();
  await user.click(
    screen.getByRole('button', { name: '30 days, 40 Insight bonus' }),
  );
  expect(screen.getByText('24 more days')).toBeVisible();
  expect(screen.getByText('6-day focus streak')).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '6');
  expect(screen.getByRole('link', { name: 'Start focusing' })).toHaveAttribute(
    'href',
    '/focus',
  );
});
it('shows completion without asking for another session', async () => {
  const user = userEvent.setup();
  render(<StreakTracker streak={{ ...streak, todayDone: true }} />);
  await user.click(screen.getByText('6-day focus streak'));
  expect(screen.getByText('You showed up today')).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'Start focusing' }),
  ).not.toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import { aimCandidates, defaultAim } from '@/domain/island/aim';
import { AimLine } from './aim-line';

const LEVEL = 9;

describe('AimLine', () => {
  it('offers a change while there is something to save for', () => {
    const aim = defaultAim(LEVEL, 0)!;
    render(
      <AimLine aim={aim} focusBalance={0} level={LEVEL} onChange={() => {}} />,
    );
    expect(screen.getByText(/Saving for/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });

  it('hides the picker once every piece is affordable', () => {
    const dearest = Math.max(...aimCandidates(LEVEL).map((c) => c.priceFocus));
    const aim = defaultAim(LEVEL, dearest)!;
    render(
      <AimLine
        aim={aim}
        focusBalance={dearest}
        level={LEVEL}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/is yours to place/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Change' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go build' })).toBeInTheDocument();
  });
});

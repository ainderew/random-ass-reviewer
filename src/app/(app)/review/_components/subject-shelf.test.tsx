import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MTLE_SUBJECTS } from '@/domain/study/medtech';
import type { SubjectShelf as Shelf } from '@/domain/types';
import { SubjectShelf } from './subject-shelf';

const shelf: Shelf = {
  due: 6,
  approved: 19,
  subjects: MTLE_SUBJECTS.map(({ id }) => ({
    subject: id,
    due: id === 'hematology' ? 6 : 0,
    approved: id === 'hematology' ? 12 : id === 'clinical-chemistry' ? 7 : 0,
  })),
};

it('says at a glance what each subject has waiting', () => {
  render(<SubjectShelf shelf={shelf} />);
  const all = screen.getByRole('link', { name: /All subjects/ });
  expect(all).toHaveAttribute('href', '/review?subject=all');
  expect(all).toHaveTextContent('6 to review');

  const hematology = screen.getByRole('link', { name: /^Hematology/ });
  expect(hematology).toHaveAttribute('href', '/review?subject=hematology');
  expect(hematology).toHaveTextContent('6 to review');
  expect(
    screen.getByRole('link', { name: /^Clinical Chemistry/ }),
  ).toHaveTextContent('All done for now');

  const microscopy = screen.getByRole('link', { name: /^Clinical Microscopy/ });
  expect(microscopy).toHaveAttribute('href', '/notes');
  expect(microscopy).toHaveTextContent('Add notes');
});

it('leads with work waiting, then caught up, then empty subjects', () => {
  render(<SubjectShelf shelf={shelf} />);
  const slides = within(screen.getByRole('list')).getAllByRole('link');
  expect(slides[0]).toHaveTextContent(/^Hematology/);
  expect(slides[1]).toHaveTextContent(/^Clinical Chemistry/);
  expect(slides[2]).toHaveTextContent('Add notes');
});

it('offers a dot per notebook to jump to it', async () => {
  render(<SubjectShelf shelf={shelf} />);
  const dots = screen.getAllByRole('button', { name: /^Show / });
  expect(dots).toHaveLength(6);
  expect(dots[0]).toHaveAttribute('aria-current', 'true');
  await userEvent.click(dots[2]!);
});

it('tells a new student to add notes rather than that they are done', () => {
  render(
    <SubjectShelf
      shelf={{
        due: 0,
        approved: 0,
        subjects: shelf.subjects.map((s) => ({ ...s, due: 0, approved: 0 })),
      }}
    />,
  );
  expect(screen.getByRole('link', { name: /All subjects/ })).toHaveTextContent(
    'Add notes',
  );
});

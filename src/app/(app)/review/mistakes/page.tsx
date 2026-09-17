import { MistakePractice } from './practice';
export default function MistakesPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="page-heading">
        <p className="journal-label">The next encounter</p>
        <h1 className="mt-3 font-serif">Give it another try.</h1>
        <p>
          Recall after a gap. These checks revisit quiz mistakes using your
          approved notes.
        </p>
      </div>
      <MistakePractice />
    </div>
  );
}

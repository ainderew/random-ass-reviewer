import Link from 'next/link';
import { FocusSoundNotes } from './focus-sound-notes';
export default function HowItWorksPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl text-ink">How studying works</h1>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          Focus with Toast, review your notes, and track what you remember.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">
          Why the daily plan looks like this
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-ink-2">
          <p>
            The aim is to remember facts later, correct errors, and apply
            knowledge to new questions. These are skills you need when taking an
            exam.
          </p>
          <ul className="list-disc space-y-3 pl-5">
            <li>
              <a
                className="text-focus underline"
                href="https://pubmed.ncbi.nlm.nih.gov/19930508/"
              >
                Recall practice · Larsen and colleagues, 2009
              </a>
              . In a randomized study with medical residents, repeated tests
              with feedback improved retention more than repeated study after
              more than six months.
            </li>
            <li>
              <a
                className="text-focus underline"
                href="https://pubmed.ncbi.nlm.nih.gov/19076480/"
              >
                Spaced review · Cepeda and colleagues, 2008
              </a>
              . Experiments showed that useful review gaps depend on how long
              information must be remembered.
            </li>
            <li>
              <a
                className="text-focus underline"
                href="https://pubmed.ncbi.nlm.nih.gov/18491500/"
              >
                Answer feedback · Butler and Roediger, 2008
              </a>
              . Feedback improved retention and reduced learning of incorrect
              multiple-choice options.
            </li>
            <li>
              <a
                className="text-focus underline"
                href="https://pubmed.ncbi.nlm.nih.gov/29265856/"
              >
                Different examples · Butler and colleagues, 2017
              </a>
              . Practising retrieval with different examples improved
              performance on new application questions.
            </li>
          </ul>
          <p>
            Aloft schedules cards using your recall ratings. Forgotten cards
            return sooner. New cards start with recall; relearning cards use
            writing; some later reviews use multiple choice when options exist.
            Your saved answer type takes priority.
          </p>
          <p>
            The methods have research support. The 15-minute default, weekly
            check-in, answer-type mix, and 7-day chart cutoff are practical
            choices, not proven ideal amounts. Adjust your time to fit your day.
          </p>
          <p>
            This exact program has not been tested on the Philippine Medtech
            board exam and cannot predict or guarantee a pass. Use it alongside
            your syllabus, reliable references, and board-style practice.
            Question-bank work outside Aloft is not tracked here.
          </p>
        </div>
      </section>
      <FocusSoundNotes />
      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">Focus and streaks</h2>
        <p className="text-ink-2">
          Sessions of at least five minutes count toward your streak. Focus time
          also fills Toast&apos;s food bowl. Optional quizzes help you check
          what you remember.
        </p>
      </section>
      <Link
        href="/study"
        className="inline-flex min-h-11 items-center text-focus underline"
      >
        Back to today
      </Link>
    </article>
  );
}

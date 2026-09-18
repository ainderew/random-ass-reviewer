import Link from 'next/link';

export function WeeklyRegimen() {
  return (
    <section
      aria-label="Weekly study regimen"
      className="mt-6 border-t border-hairline pt-5"
    >
      <h3 className="font-serif text-xl font-bold">Once this week</h3>
      <p className="mt-1 text-sm text-ink-2">
        Choose any day for this check-in.
      </p>
      <ul className="mt-4 list-disc space-y-4 pl-5 text-sm">
        <li>
          <p className="text-base font-semibold">
            Check what you still remember.
          </p>
          <p className="mt-1 text-ink-2">
            Look at accuracy after 7+ days and repeated mistakes in your
            progress chart.
          </p>
          <p className="mt-1 text-ink-2">
            Why: remembering later matters more than getting it right just after
            studying.
          </p>
          <Link
            href="/review/progress"
            className="inline-flex min-h-11 items-center text-focus underline underline-offset-4"
          >
            See learning progress
          </Link>
        </li>
        <li>
          <p className="text-base font-semibold">
            Work through one difficult topic.
          </p>
          <p className="mt-1 text-ink-2">
            Use your mistakes to choose it. Check the source, explain it from
            memory, then fix unclear cards.
          </p>
          <p className="mt-1 text-ink-2">
            Why: correcting a gap gives your next review something useful to
            test.
          </p>
          <Link
            href="/notes"
            className="inline-flex min-h-11 items-center text-focus underline underline-offset-4"
          >
            Open notes and cards
          </Link>
        </li>
        <li>
          <p className="text-base font-semibold">
            Try unfamiliar exam questions.
          </p>
          <p className="mt-1 text-ink-2">
            If you have a trusted board-review question bank, answer a small set
            with notes closed. Check every explanation.
          </p>
          <p className="mt-1 text-ink-2">
            Why: new questions check whether you can apply an idea beyond a
            familiar card.
          </p>
        </li>
      </ul>
      <p className="mt-4 text-sm text-ink-2">
        Busy week? Resume with the next due batch. You do not need to finish a
        backlog in one sitting.
      </p>
      <details className="mt-3 border-t border-hairline">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
          Why this plan helps with exam preparation
        </summary>
        <div className="space-y-4 pb-3 text-sm leading-relaxed text-ink-2">
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
      </details>
    </section>
  );
}

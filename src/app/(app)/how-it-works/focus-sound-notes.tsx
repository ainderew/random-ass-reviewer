// What the research says about studying with background sound, for the
// Focus tab's sound picker. Each line was checked against the study's
// abstract or full text; keep it that way.
export const FocusSoundNotes = () => (
  <section id="focus-sound" className="scroll-mt-20 space-y-2">
    <h2 className="font-serif text-2xl text-ink">Focus sounds</h2>
    <div className="space-y-4 text-sm leading-relaxed text-ink-2">
      <p>
        No background sound is proven to help everyone study. Silence is the
        default. Sounds you choose, alone or mixed, play only while the timer
        runs, and stop for the quiz, because memory works best in quiet.
      </p>
      <ul className="list-disc space-y-3 pl-5">
        <li>
          <a
            className="text-focus underline"
            href="https://pubmed.ncbi.nlm.nih.gov/29958067/"
          >
            Silence · Vasilev and colleagues, 2018
          </a>
          . Across 65 studies, background sound slightly lowered reading
          comprehension. Lyrics and nearby talk did the most harm; music without
          words made almost no difference.
        </li>
        <li>
          <a
            className="text-focus underline"
            href="https://doi.org/10.1080/14640748908402355"
          >
            Memorizing · Salamé and Baddeley, 1989
          </a>
          . Remembering lists in order went worst with sung music, and music
          without words still did worse than quiet in two of three experiments.
        </li>
        <li>
          <a
            className="text-focus underline"
            href="https://pubmed.ncbi.nlm.nih.gov/9988598/"
          >
            Rain · Ellermeier and Hellbrück, 1998
          </a>
          . Talk nearby hurt memory as much when quiet as when loud. Steady
          noise over the talk reduced the harm.
        </li>
        <li>
          <a
            className="text-focus underline"
            href="https://pubmed.ncbi.nlm.nih.gov/38428577/"
          >
            Noise · Nigg and colleagues, 2024
          </a>
          . White or pink noise gave young people with ADHD or attention
          problems a small benefit on attention tasks, and others a small
          drawback. Brown noise, a deeper version, has not been tested.
        </li>
        <li>
          <a
            className="text-focus underline"
            href="https://doi.org/10.1177/0305735611400173"
          >
            Soft music · Thompson and colleagues, 2012
          </a>
          . Only fast, loud music lowered reading comprehension. Slower or
          softer versions did not.
        </li>
      </ul>
      <p>
        So: silence when you can have it, rain when people are talking nearby,
        noise if your mind keeps wandering, and soft piano if you would rather
        have music. Keep the volume low.
      </p>
    </div>
  </section>
);

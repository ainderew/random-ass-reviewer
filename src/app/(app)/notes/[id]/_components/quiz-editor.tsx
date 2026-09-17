'use client';
import type { QuizContent } from '@/domain/study/quiz-content';

const field =
  'mt-1 w-full rounded-md border border-hairline bg-ground px-3 py-2 text-base text-ink';
export const QuizEditor = ({
  quiz,
  onChange,
}: {
  quiz: QuizContent | null;
  onChange: (quiz: QuizContent | null) => void;
}) => (
  <fieldset className="space-y-4 border-t border-hairline pt-4">
    <legend className="text-ink">Optional practice question</legend>
    <label className="flex min-h-11 items-center gap-3 text-ink-2">
      <input
        type="checkbox"
        className="size-5 accent-focus"
        checked={!!quiz}
        onChange={(e) =>
          onChange(
            e.target.checked
              ? {
                  explanation: '',
                  distractors: Array.from({ length: 3 }, () => ({
                    text: '',
                    explanation: '',
                  })),
                }
              : null,
          )
        }
      />
      Include reviewed multiple-choice practice
    </label>
    {quiz ? (
      <>
        <p className="text-ink-2">
          The flashcard answer is the correct choice. Check that each
          alternative is plausible but incorrect for this question.
        </p>
        <label className="block text-ink-2">
          Why the answer is correct
          <textarea
            required
            minLength={10}
            maxLength={1000}
            className={field}
            value={quiz.explanation}
            onChange={(e) => onChange({ ...quiz, explanation: e.target.value })}
          />
        </label>
        {quiz.distractors.map((choice, i) => (
          <div key={i} className="space-y-2">
            <label className="block text-ink-2">
              Alternative {i + 1}
              <textarea
                required
                maxLength={1000}
                className={field}
                value={choice.text}
                onChange={(e) =>
                  onChange({
                    ...quiz,
                    distractors: quiz.distractors.map((d, j) =>
                      i === j ? { ...d, text: e.target.value } : d,
                    ),
                  })
                }
              />
            </label>
            <label className="block text-ink-2">
              Why alternative {i + 1} is incorrect
              <textarea
                required
                minLength={10}
                maxLength={1000}
                className={field}
                value={choice.explanation}
                onChange={(e) =>
                  onChange({
                    ...quiz,
                    distractors: quiz.distractors.map((d, j) =>
                      i === j ? { ...d, explanation: e.target.value } : d,
                    ),
                  })
                }
              />
            </label>
          </div>
        ))}
      </>
    ) : (
      <p className="text-ink-2">
        This card can still be reviewed. It will not appear in multiple-choice
        quizzes.
      </p>
    )}
  </fieldset>
);

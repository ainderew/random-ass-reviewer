'use client';
import { useId, useState } from 'react';
import { MTLE_SUBJECTS, type MedtechSubject } from '@/domain/study/medtech';
import { QuizEditor } from './quiz-editor';
import type { Card, UpdateCardRequest } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { SourceEvidence } from '@/components/study/source-evidence';

export const CardEditor = ({
  card,
  source,
  sourceTitle,
  busy,
  onSave,
  onCancel,
}: {
  card: Card;
  source?: string;
  sourceTitle?: string;
  busy: boolean;
  onSave: (body: UpdateCardRequest) => void;
  onCancel: () => void;
}) => {
  const id = useId();
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);
  const [subject, setSubject] = useState<MedtechSubject | null>(card.subject);
  const [topic, setTopic] = useState(card.topic ?? '');
  const [quiz, setQuiz] = useState(card.quiz);
  const [approved, setApproved] = useState(false);
  // An approval describes exactly the content checked. Any edit requires rechecking.
  const change = (update: () => void) => {
    update();
    setApproved(false);
  };
  const field = 'study-field';
  return (
    <form
      className="card-editor"
      aria-label="Edit flashcard"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        onSave({
          question,
          answer,
          subject,
          topic: topic.trim() || null,
          quiz,
          reviewStatus: approved ? 'approved' : 'draft',
        });
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-3 border-b border-hairline pb-4">
        <h2 className="text-xl font-semibold">Check this card</h2>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="card-setup-grid">
        <div className="min-w-0 space-y-5 pt-5">
          <div>
            <label htmlFor={`${id}-question`} className="card-section-label">
              Question
            </label>
            <p
              id={`${id}-question-hint`}
              className="mt-1 mb-2 text-sm text-muted"
            >
              The prompt you will see first.
            </p>
            <textarea
              id={`${id}-question`}
              aria-describedby={`${id}-question-hint`}
              required
              minLength={5}
              maxLength={300}
              value={question}
              onChange={(e) => change(() => setQuestion(e.target.value))}
              rows={3}
              className={field}
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor={`${id}-answer`} className="card-section-label">
              Answer
            </label>
            <p
              id={`${id}-answer-hint`}
              className="mt-1 mb-2 text-sm text-muted"
            >
              What you should recall before revealing.
            </p>
            <textarea
              id={`${id}-answer`}
              aria-describedby={`${id}-answer-hint`}
              required
              maxLength={1000}
              value={answer}
              onChange={(e) => change(() => setAnswer(e.target.value))}
              rows={4}
              className={field}
              disabled={busy}
            />
          </div>
        </div>
        <div className="min-w-0 pt-5">
          <SourceEvidence
            quote={card.sourceQuote}
            passage={source}
            title={sourceTitle}
          />
          <p className="mt-3 text-xs text-muted">
            Read-only reference. Compare your answer with the passage.
          </p>
        </div>
      </div>
      <fieldset className="mt-6 border-t border-hairline pt-5">
        <legend className="card-section-label">Organize this card</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-subject`} className="text-sm font-medium">
              MTLE subject
            </label>
            <select
              id={`${id}-subject`}
              className={`mt-2 ${field}`}
              value={subject ?? ''}
              disabled={busy}
              onChange={(e) =>
                change(() =>
                  setSubject((e.target.value as MedtechSubject) || null),
                )
              }
            >
              <option value="">Choose a subject (optional)</option>
              {MTLE_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">
              Used to group cards in your study plan.
            </p>
          </div>
          <div>
            <label htmlFor={`${id}-topic`} className="text-sm font-medium">
              Topic (optional)
            </label>
            <input
              id={`${id}-topic`}
              className={`mt-2 ${field}`}
              value={topic}
              disabled={busy}
              maxLength={100}
              onChange={(e) => change(() => setTopic(e.target.value))}
              placeholder="For example, red cell morphology"
            />
          </div>
        </div>
      </fieldset>
      <details
        className="mt-5 border-t border-hairline pt-2"
        open={quiz !== null || undefined}
      >
        <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">
          Multiple-choice practice {quiz ? '· included' : '· optional'}
        </summary>
        <div className="mt-3">
          <fieldset disabled={busy}>
            <QuizEditor
              quiz={quiz}
              onChange={(next) => change(() => setQuiz(next))}
            />
          </fieldset>
        </div>
      </details>
      <div className="mt-6 border-t border-hairline pt-5">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-focus"
            checked={approved}
            disabled={busy}
            onChange={(e) => setApproved(e.target.checked)}
          />
          <span>
            I checked the answer against the source, the subject, and any quiz
            choices and explanations. Approve for study.
          </span>
        </label>
        <p className="mt-3 text-xs text-muted">
          {approved
            ? 'This card will be available in review sessions.'
            : 'Save a draft to finish later. Only approved cards enter review sessions.'}
        </p>
        <Button
          className="mt-4"
          type="submit"
          block
          size="lg"
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Saving…' : approved ? 'Save and approve' : 'Save draft'}
        </Button>
      </div>
    </form>
  );
};

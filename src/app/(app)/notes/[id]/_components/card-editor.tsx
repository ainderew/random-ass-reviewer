'use client';

import { useState } from 'react';
import { MTLE_SUBJECTS, type MedtechSubject } from '@/domain/study/medtech';
import { QuizEditor } from './quiz-editor';
import type { Card, UpdateCardRequest } from '@/domain/types';
import { Button } from '@/components/ui/button';

// Users will find awkward cards. Not being able to fix one is worse.
export const CardEditor = ({
  card,
  source,
  busy,
  onSave,
  onCancel,
}: {
  card: Card;
  source?: string;
  busy: boolean;
  onSave: (body: UpdateCardRequest) => void;
  onCancel: () => void;
}) => {
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);
  const [subject, setSubject] = useState<MedtechSubject | null>(card.subject);
  const [topic, setTopic] = useState(card.topic ?? '');
  const [quiz, setQuiz] = useState(card.quiz);
  const [approved, setApproved] = useState(false);
  const field =
    'w-full rounded-md border border-hairline bg-ground px-3 py-2 text-base leading-relaxed text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  return (
    <form
      className="space-y-3 rounded-lg border border-focus/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
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
      <label className="block text-sm text-ink-2">
        Question
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          className={`mt-1 ${field}`}
        />
      </label>
      <label className="block text-sm text-ink-2">
        Answer
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          className={`mt-1 ${field}`}
        />
      </label>
      <label className="block text-ink-2">
        MTLE subject
        <select
          className={field}
          value={subject ?? ''}
          onChange={(e) =>
            setSubject((e.target.value as MedtechSubject) || null)
          }
        >
          <option value="">Unclassified</option>
          {MTLE_SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-ink-2">
        Topic
        <input
          className={field}
          maxLength={100}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="For example, red cell morphology"
        />
      </label>
      <QuizEditor quiz={quiz} onChange={setQuiz} />
      <label className="flex items-start gap-3 text-ink-2">
        <input
          type="checkbox"
          className="mt-1 size-5 accent-focus"
          checked={approved}
          onChange={(e) => setApproved(e.target.checked)}
        />
        I checked the answer against the source, the subject, and any quiz
        choices and explanations. Approve for study.
      </label>
      {source ? (
        <details className="text-ink-2">
          <summary className="cursor-pointer py-2">Read source passage</summary>
          <p className="whitespace-pre-wrap leading-relaxed">{source}</p>
        </details>
      ) : null}
      <p className="text-sm text-muted">“{card.sourceQuote}”</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {approved ? 'Save and approve' : 'Save draft'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

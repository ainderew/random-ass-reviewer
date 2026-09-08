'use client';

import { useState } from 'react';
import type { Card, UpdateCardRequest } from '@/domain/types';
import { Button } from '@/components/ui/button';

// Users will find awkward cards. Not being able to fix one is worse.
export const CardEditor = ({
  card,
  busy,
  onSave,
  onCancel,
}: {
  card: Card;
  busy: boolean;
  onSave: (body: UpdateCardRequest) => void;
  onCancel: () => void;
}) => {
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);
  const field =
    'w-full rounded-md border border-hairline bg-ground px-3 py-2 text-base leading-relaxed text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  return (
    <form
      className="space-y-3 rounded-lg border border-focus/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ question, answer });
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
      <p className="text-sm text-muted">“{card.sourceQuote}”</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} aria-busy={busy}>
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

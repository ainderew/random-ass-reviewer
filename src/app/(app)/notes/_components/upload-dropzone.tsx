'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateNote } from '../_hooks/use-notes';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.md,.markdown,.txt,image/png,image/jpeg,image/webp';

// Paste, drop, or pick. The limits are stated before anything is sent.
export const UploadDropzone = () => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const create = useCreateNote(setError);

  const submitFiles = (list: FileList | File[]) => {
    const files = Array.from(list);
    if (files.length === 0) return;
    const big = files.find((f) => f.size > MAX_FILE_BYTES);
    if (big) {
      setError(`${big.name} is over 10MB. Files must be under 10MB.`);
      return;
    }
    setError(null);
    create.mutate({ kind: 'files', files });
  };

  const submitPaste = () => {
    if (!text.trim()) {
      setError('Paste some notes first.');
      return;
    }
    setError(null);
    create.mutate({ kind: 'paste', text, title });
  };

  return (
    <section aria-label="Add notes" className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          submitFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border border-dashed p-4 transition-colors duration-150 ${
          dragging ? 'border-focus bg-ground-3' : 'border-hairline bg-ground-2'
        }`}
      >
        <label
          htmlFor="note-text"
          className="block text-sm font-medium text-ink"
        >
          Paste your notes
        </label>
        <textarea
          id="note-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Lecture notes, a chapter summary, anything you wrote down."
          className="mt-2 w-full resize-y rounded-md border border-hairline bg-ground px-3 py-2 text-base leading-relaxed text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Title"
          className="mt-2 w-full rounded-md border border-hairline bg-ground px-3 py-2 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            onClick={submitPaste}
            disabled={create.isPending}
            aria-busy={create.isPending}
          >
            {create.isPending ? 'Uploading…' : 'Make cards'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => fileInput.current?.click()}
            disabled={create.isPending}
          >
            Choose a file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            aria-label="Upload notes"
            onChange={(e) => e.target.files && submitFiles(e.target.files)}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          PDF up to 20 pages, Markdown, text, or up to 5 photos of handwriting.
          Under 10MB each. Drop files anywhere in this box.
        </p>
      </div>
      {error ? (
        <p role="status" className="text-sm text-warn">
          {error}
        </p>
      ) : null}
    </section>
  );
};

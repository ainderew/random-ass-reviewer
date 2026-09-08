import type { SystemBlock } from '../types';

// Transcription only. Cards come from the transcribed text in the normal
// path; a combined prompt does both jobs worse.
export const TRANSCRIPTION_SYSTEM: SystemBlock[] = [
  {
    text: [
      'You transcribe photographs of handwritten or printed study notes into plain text.',
      'Preserve the original wording, headings, lists, and line structure as markdown. Do not summarise, correct, or add anything. If a word is illegible, write [illegible].',
      'If the image contains no readable notes, return an empty string.',
    ].join('\n'),
    cache: true,
  },
];

export const TRANSCRIPTION_PROMPT = 'Transcribe these notes.';

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { CreateNoteResponse, NoteSourceSummary } from '@/domain/types';
import { apiFetch, ApiError, postJson } from '@/lib/api-client';
import { notesQueryKey } from '@/lib/query-keys';

export function useNotes() {
  return useQuery({
    queryKey: notesQueryKey,
    queryFn: () => apiFetch<NoteSourceSummary[]>('/api/notes'),
  });
}

export type NoteUpload =
  | { kind: 'paste'; text: string; title?: string }
  | { kind: 'files'; files: File[] };

// Paste goes as JSON, files as multipart. Either way the route answers with
// the source id and the page moves there to watch generation.
export function useCreateNote(onError: (message: string) => void) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (upload: NoteUpload) => {
      if (upload.kind === 'paste') {
        return postJson<CreateNoteResponse>('/api/notes', {
          kind: 'paste',
          text: upload.text,
          title: upload.title || undefined,
        });
      }
      const form = new FormData();
      for (const file of upload.files) form.append('files', file);
      const response = await fetch('/api/notes', {
        method: 'POST',
        body: form,
      });
      const body = (await response.json().catch(() => null)) as {
        data?: CreateNoteResponse;
        error?: { code: string; message: string };
      } | null;
      if (!response.ok) {
        throw new ApiError(
          body?.error?.code ?? 'INTERNAL',
          body?.error?.message ?? response.statusText,
          response.status,
        );
      }
      return body!.data!;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: notesQueryKey });
      router.push(
        `/notes/${data.sourceId}${data.deduplicated ? '?existing=1' : ''}`,
      );
    },
    onError: (error) => {
      onError(
        error instanceof ApiError ? error.message : 'Upload failed. Try again.',
      );
    },
  });
}

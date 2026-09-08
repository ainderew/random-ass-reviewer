'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ApiKeyStatus, UsageSummary } from '@/domain/types';
import { Button } from '@/components/ui/button';
import { apiFetch, ApiError } from '@/lib/api-client';

const keyQuery = ['settings', 'api-key'] as const;
const usageQuery = ['settings', 'usage'] as const;

export const ApiKeyForm = () => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const status = useQuery({
    queryKey: keyQuery,
    queryFn: () => apiFetch<ApiKeyStatus>('/api/settings/api-key'),
  });
  const usage = useQuery({
    queryKey: usageQuery,
    queryFn: () => apiFetch<UsageSummary>('/api/settings/usage'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keyQuery });
    void queryClient.invalidateQueries({ queryKey: usageQuery });
  };
  const save = useMutation({
    mutationFn: (apiKey: string) =>
      apiFetch<ApiKeyStatus>('/api/settings/api-key', {
        method: 'PUT',
        body: JSON.stringify({ apiKey }),
      }),
    onSuccess: () => {
      setDraft('');
      setMessage('Key saved. Generation now runs on your own account.');
      refresh();
    },
    onError: (e) =>
      setMessage(
        e instanceof ApiError ? e.message : 'Could not save that key.',
      ),
  });
  const clear = useMutation({
    mutationFn: () =>
      apiFetch<ApiKeyStatus>('/api/settings/api-key', { method: 'DELETE' }),
    onSuccess: () => {
      setMessage('Key removed.');
      refresh();
    },
  });

  const cents = usage.data?.costCents ?? 0;
  const quota = usage.data?.quotaCents ?? 0;

  return (
    <section aria-label="AI settings" className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl text-ink">Your Anthropic key</h2>
        <p className="max-w-[46ch] text-sm leading-relaxed text-ink-2">
          Optional. With your own key, card generation bills your Anthropic
          account and the monthly limit here no longer applies. The key is
          encrypted at rest and never shown in full again.
        </p>
      </div>

      {status.data?.configured ? (
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-md bg-ground-2 px-2 py-1 font-mono text-sm text-ink">
            {status.data.masked}
          </code>
          <Button
            variant="ghost"
            onClick={() => clear.mutate()}
            disabled={clear.isPending}
          >
            Remove key
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(draft.trim());
          }}
        >
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-ant-…"
            aria-label="Anthropic API key"
            autoComplete="off"
            className="flex-1 rounded-md border border-hairline bg-ground px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          <Button
            type="submit"
            disabled={save.isPending || !draft.trim()}
            aria-busy={save.isPending}
          >
            {save.isPending ? 'Checking…' : 'Save key'}
          </Button>
        </form>
      )}
      {message ? (
        <p role="status" className="text-sm text-ink-2">
          {message}
        </p>
      ) : null}

      <div className="space-y-1 border-t border-hairline pt-6">
        <h2 className="font-serif text-2xl text-ink">This month</h2>
        <p className="text-sm text-ink-2">
          {usage.data
            ? `${(usage.data.inputTokens + usage.data.outputTokens).toLocaleString()} tokens, about $${(cents / 100).toFixed(2)}${usage.data.byok ? ' on your key' : ` of a $${(quota / 100).toFixed(2)} limit`}.`
            : 'Loading…'}
        </p>
      </div>
    </section>
  );
};

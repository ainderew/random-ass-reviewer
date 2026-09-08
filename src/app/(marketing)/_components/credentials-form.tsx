'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, postJson } from '@/lib/api-client';

type Mode = 'sign-in' | 'register';

const field =
  'min-h-12 w-full rounded-md border border-hairline bg-ground px-3 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

// Email and password, no third party in the way. The server sets the same
// session cookie Auth.js uses, so everything after this is one system.
export const CredentialsForm = () => {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await postJson(
        mode === 'register' ? '/api/auth/register' : '/api/auth/login',
        mode === 'register'
          ? { email, password, name: name || undefined }
          : { email, password },
      );
      router.push('/study');
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code !== 'INTERNAL'
          ? caught.message
          : 'Something went wrong. Try again.',
      );
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {mode === 'register' ? (
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          autoComplete="name"
          aria-label="Name"
        />
      ) : null}
      <input
        className={field}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        aria-label="Email"
      />
      <input
        className={field}
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={
          mode === 'register' ? 'Password, 8 characters or more' : 'Password'
        }
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        aria-label="Password"
      />
      <Button type="submit" size="lg" block disabled={busy} aria-busy={busy}>
        {busy
          ? 'One moment…'
          : mode === 'register'
            ? 'Create account'
            : 'Sign in'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setMode(mode === 'register' ? 'sign-in' : 'register');
          setError(null);
        }}
        className="min-h-11 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
      >
        {mode === 'register'
          ? 'Have an account? Sign in'
          : 'New here? Create an account'}
      </button>
    </form>
  );
};

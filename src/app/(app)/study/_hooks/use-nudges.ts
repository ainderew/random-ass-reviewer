'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import type { PushStatus } from '@/domain/types';
import { apiFetch, postJson } from '@/lib/api-client';
import { pushQueryKey } from '@/lib/query-keys';

// The cat's push nudges on this device. Hidden entirely when the server has
// no keys or the browser cannot receive push; on an iPhone or iPad that
// means Aloft has to be added to the Home Screen first.
export type NudgeSupport = 'ready' | 'install-first' | 'unsupported';

function support(): NudgeSupport {
  if (typeof window === 'undefined') return 'unsupported';
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as { standalone?: boolean }).standalone === true;
  const apple =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (apple && !standalone) return 'install-first';
  const capable =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  return capable ? 'ready' : 'unsupported';
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  return (await navigator.serviceWorker?.getRegistration('/')) ?? null;
}

export function useNudges() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: pushQueryKey,
    queryFn: () => apiFetch<PushStatus>('/api/push/subscription'),
  });
  const [where, setWhere] = useState<NudgeSupport>('unsupported');
  const [onHere, setOnHere] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // The browser decides what is possible here; read it once, after mount.
  useEffect(() => {
    let live = true;
    void (async () => {
      const found = support();
      const reg = await registration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!live) return;
      setWhere(found === 'ready' && !reg ? 'unsupported' : found);
      setOnHere(sub !== null);
    })();
    return () => {
      live = false;
    };
  }, []);

  const run = useCallback(
    async (job: () => Promise<string | null>) => {
      setBusy(true);
      setMessage(null);
      try {
        setMessage(await job());
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'That did not work');
      } finally {
        setBusy(false);
        void queryClient.invalidateQueries({ queryKey: pushQueryKey });
      }
    },
    [queryClient],
  );

  const turnOn = () =>
    run(async () => {
      const key = status.data?.publicKey;
      const reg = await registration();
      if (!key || !reg) return 'Nudges are not available here yet.';
      if ((await Notification.requestPermission()) !== 'granted') {
        return 'Notifications are blocked for Aloft in this browser.';
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(key),
      });
      await postJson('/api/push/subscription', sub.toJSON());
      setOnHere(true);
      return null;
    });

  const turnOff = () =>
    run(async () => {
      const sub = await (await registration())?.pushManager.getSubscription();
      if (sub) {
        await apiFetch('/api/push/subscription', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setOnHere(false);
      return null;
    });

  const test = () =>
    run(async () => {
      const { delivered } = await postJson<{ delivered: number }>(
        '/api/push/test',
      );
      return delivered > 0
        ? 'Sent. It should arrive in a moment.'
        : 'Nothing was delivered.';
    });

  return {
    available: Boolean(status.data?.publicKey) && where !== 'unsupported',
    where,
    onHere,
    busy,
    message,
    turnOn,
    turnOff,
    test,
  };
}

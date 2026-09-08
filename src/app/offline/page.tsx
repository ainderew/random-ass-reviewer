import Link from 'next/link';

export const metadata = { title: 'Offline' };

// Served by the service worker when a navigation fails. Plain and calm.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-6">
      <p className="font-serif text-xl text-ink">Aloft</p>
      <h1 className="font-serif text-3xl text-ink">You are offline</h1>
      <p className="leading-relaxed text-ink-2">
        Anything you did while connected is safe on the server. Reconnect and
        pick up where you left off.
      </p>
      <Link
        href="/study"
        className="inline-flex min-h-11 items-center self-start rounded-md bg-focus px-4 font-medium text-ground"
      >
        Try again
      </Link>
    </main>
  );
}

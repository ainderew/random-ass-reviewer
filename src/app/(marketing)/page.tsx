import { redirect } from 'next/navigation';
import { BoltGlyph, DiamondGlyph, IslandIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { env, googleSignInEnabled } from '@/lib/env';
import { auth, signIn } from '@/server/auth';
import { CredentialsForm } from './_components/credentials-form';

type SearchParams = Promise<{ error?: string | string[] }>;

// The loop is a real three-step sequence, so an ordered list is honest here.
const loop = [
  { Glyph: BoltGlyph, text: 'Ten Focus for every verified minute you study.' },
  {
    Glyph: DiamondGlyph,
    text: 'Insight for every card from your own notes you recall.',
  },
  {
    Glyph: IslandIcon,
    text: 'Spend both on a floating island that is visibly yours.',
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (session?.user?.id) redirect('/study');

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:justify-center md:px-8">
      <p className="font-serif text-xl text-ink">Aloft</p>

      <section className="my-auto space-y-8 py-14 md:my-0 md:py-12">
        <div className="space-y-5">
          <h1 className="font-serif text-5xl leading-[1.02] tracking-[-0.02em] text-ink md:text-6xl">
            Study. Earn. Build.
          </h1>
          <p className="max-w-[46ch] text-lg leading-relaxed text-ink-2">
            Run a focus session on your own notes. The server checks you stayed
            on task, and pays you for it.
          </p>
        </div>

        <ol className="space-y-4">
          {loop.map(({ Glyph, text }) => (
            <li key={text} className="flex items-start gap-3 text-ink-2">
              <span className="mt-1 flex size-6 shrink-0 items-center justify-center text-focus">
                <Glyph size={18} />
              </span>
              <span className="max-w-[40ch] leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-auto space-y-4 sm:max-w-xs md:mt-0">
        <CredentialsForm />
        {googleSignInEnabled(env) ? (
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/study' });
            }}
          >
            <Button type="submit" size="lg" block variant="ghost">
              Continue with Google
            </Button>
          </form>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-warn">
            Sign-in did not finish. Try again.
          </p>
        ) : (
          <p className="text-sm text-muted">Free. An email is all it needs.</p>
        )}
      </div>
    </main>
  );
}

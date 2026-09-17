import { CoastalHero } from '@/components/coastal-hero';
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
    text: 'Insight for honest flashcard reviews and quiz answers.',
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8">
      <p className="font-serif text-2xl text-ink">Aloft</p>
      <CoastalHero />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-6 px-2 py-3 md:p-6">
          <div className="space-y-5">
            <h1 className="font-serif text-3xl leading-tight tracking-tight text-ink md:text-4xl">
              Study. Earn. Build.
            </h1>
            <p className="max-w-[46ch] text-lg leading-relaxed text-ink-2">
              Bring your notes, practice your flashcards, and make a little time
              to focus. Every session helps build your island.
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

        <div className="paper-panel h-fit space-y-4 p-5 sm:p-8">
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
            <p className="text-sm text-muted">
              Free. An email is all it needs.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

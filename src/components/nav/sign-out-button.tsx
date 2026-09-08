import { SignOutIcon } from '@/components/icons';
import { signOut } from '@/server/auth';

// Server component: the action needs the server-only signOut.
export const SignOutButton = () => (
  <form
    action={async () => {
      'use server';
      await signOut({ redirectTo: '/' });
    }}
  >
    <button
      type="submit"
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-[0.9375rem] text-ink-2 transition-colors duration-150 hover:bg-ground-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:px-3"
    >
      <SignOutIcon size={20} />
      <span className="sr-only md:not-sr-only">Sign out</span>
    </button>
  </form>
);

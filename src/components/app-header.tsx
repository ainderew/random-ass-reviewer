import Link from 'next/link';
import { CurrencyHud } from '@/components/currency-hud';
import { SettingsIcon } from '@/components/icons';
import { SignOutButton } from '@/components/nav/sign-out-button';
import { TopNav } from '@/components/nav/top-nav';

export const AppHeader = () => (
  <header className="sticky top-0 z-(--z-sticky) border-b border-hairline bg-ground/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
    <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 md:h-16 md:gap-8 md:px-6">
      <Link
        href="/study"
        className="font-serif text-xl text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Aloft
      </Link>
      <TopNav />
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <CurrencyHud />
        <Link
          href="/settings"
          aria-label="Settings"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-2 transition-colors duration-150 hover:bg-ground-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <SettingsIcon size={20} />
        </Link>
        <SignOutButton />
      </div>
    </div>
  </header>
);

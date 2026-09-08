'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActivePath, navLinks } from './links';

// Phone navigation. Fixed to the bottom, inside thumb reach, padded past the
// home indicator. Hidden from 768px up.
export const TabBar = () => {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-(--z-sticky) border-t border-hairline bg-ground-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="grid grid-cols-4">
        {navLinks.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
                  active ? 'text-ink' : 'text-muted active:text-ink-2'
                }`}
              >
                <Icon size={22} className={active ? 'text-focus' : undefined} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

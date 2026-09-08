'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActivePath, navLinks } from './links';

// Desktop and tablet navigation. Hidden under 768px, where the tab bar takes over.
export const TopNav = () => {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {navLinks.map(({ href, label }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 text-[0.9375rem] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active
                    ? 'text-ink'
                    : 'text-ink-2 hover:bg-ground-2 hover:text-ink'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

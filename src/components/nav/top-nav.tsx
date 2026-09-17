'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActivePath, navLinks } from './links';

// Desktop and tablet navigation. Hidden under 1024px, where the tab bar takes over.
export const TopNav = () => {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {navLinks.map(({ href, label, Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-[0.9375rem] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active
                    ? 'bg-ground-3/70 text-focus font-medium'
                    : 'text-ink-2 hover:bg-ground-2 hover:text-ink'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

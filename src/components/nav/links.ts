import {
  HomeIcon,
  IslandIcon,
  NotesIcon,
  ReviewIcon,
  TimerIcon,
} from '@/components/icons';

// Shared destinations for phone and desktop navigation. Today is the cat and
// the one next step; Progress opens from the weekly check-in on Today.
export const navLinks = [
  { href: '/study', label: 'Today', Icon: HomeIcon },
  { href: '/focus', label: 'Focus', Icon: TimerIcon },
  { href: '/review', label: 'Review', Icon: ReviewIcon },
  { href: '/notes', label: 'Notes', Icon: NotesIcon },
  { href: '/island', label: 'Island', Icon: IslandIcon },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  const match = navLinks
    .filter(
      (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href === href;
}

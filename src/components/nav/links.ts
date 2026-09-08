import {
  IslandIcon,
  NotesIcon,
  ReviewIcon,
  TimerIcon,
} from '@/components/icons';

// All four routes from day one so the shell is stable from Phase 2 on.
export const navLinks = [
  { href: '/study', label: 'Study', Icon: TimerIcon },
  { href: '/notes', label: 'Notes', Icon: NotesIcon },
  { href: '/review', label: 'Review', Icon: ReviewIcon },
  { href: '/island', label: 'Island', Icon: IslandIcon },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

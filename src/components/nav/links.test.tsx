import { isActivePath, navLinks } from './links';
it('lights exactly one tab for every page under it', () => {
  for (const [path, expected] of [
    ['/study', 'Today'],
    ['/focus', 'Focus'],
    ['/review/progress', 'Review'],
    ['/review/mistakes', 'Review'],
    ['/notes/123', 'Notes'],
  ]) {
    expect(
      navLinks
        .filter((link) => isActivePath(path!, link.href))
        .map((link) => link.label),
    ).toEqual([expected]);
  }
});

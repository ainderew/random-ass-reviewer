import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

// The mechanical violations. The rest is checked by hand.
for (const path of ['/study', '/review', '/notes', '/settings']) {
  test(`axe finds no violations on ${path}`, async ({ page, context }) => {
    await signInAsSmokeUser(context);
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const summary = results.violations.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
    expect(summary).toEqual([]);
  });
}

export interface Page {
  limit: number;
  offset: number;
}

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 500;

// Every list query goes through this so nothing can ask for an unbounded result.
export function clampPage(page: Partial<Page> = {}): Page {
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, page.limit ?? DEFAULT_PAGE_LIMIT),
  );
  const offset = Math.max(0, page.offset ?? 0);
  return { limit, offset };
}

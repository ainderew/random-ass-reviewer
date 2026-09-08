import { z } from 'zod';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic'] as const;
export type Rarity = (typeof RARITIES)[number];

export const cacheContentsSchema = z.object({
  assetIds: z.array(z.string().min(1)),
  focus: z.number().int().nonnegative(),
  insight: z.number().int().nonnegative(),
});
export type CacheContents = z.infer<typeof cacheContentsSchema>;

export interface Cache {
  id: string;
  userId: string;
  sessionId: string;
  rarity: Rarity;
  contents: CacheContents;
  // Null means unopened.
  openedAt: Date | null;
}

export interface CacheOpenResponse {
  rarity: Rarity;
  contents: CacheContents;
  // True when this call found it already open and returned the same contents.
  alreadyOpened: boolean;
}

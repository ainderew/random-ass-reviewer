import { z } from 'zod';

export interface GridCoord {
  x: number;
  z: number;
}

export interface Island {
  id: string;
  userId: string;
  theme: string;
  tileCount: number;
}

export interface Placement {
  id: string;
  islandId: string;
  assetId: string;
  x: number;
  z: number;
  // Quarter turns, 0-3.
  rotY: number;
  placedAt: Date;
}

export const placeAssetRequestSchema = z.object({
  assetId: z.string().min(1),
  x: z.number().int(),
  z: z.number().int(),
  rotY: z.number().int().min(0).max(3).default(0),
});
export type PlaceAssetRequest = z.infer<typeof placeAssetRequestSchema>;

export interface IslandView {
  island: Island;
  placements: Placement[];
  // IANA zone the server currently believes; the client corrects it once.
  timeZone: string;
  signals: WorldSignals;
  // Starter pieces plus everything won from caches.
  ownedAssetIds: string[];
  // Won copies not yet placed, by asset id. Placing one costs nothing.
  freeCredits: Record<string, number>;
}

export interface PlaceAssetResponse {
  placement: Placement;
  stats: import('./user').PublicUserStats;
}

export interface RemovePlacementResponse {
  refund: { focus: number; insight: number };
  stats: import('./user').PublicUserStats;
}

// Real study history the island can render as props.
export interface WorldSignals {
  totalFocusHours: number;
  distinctSubjects: string[];
  longestStreak: number;
}

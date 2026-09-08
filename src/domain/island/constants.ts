// World units per tile. Props are authored to sit inside one tile.
export const TILE_SIZE = 2;

export const DEFAULT_TILE_COUNT = 9;

// Removing a placement gives half back, rounded down. Full refunds make
// placement consequence-free; none punishes experimenting.
export const REMOVAL_REFUND_RATIO = 0.5;

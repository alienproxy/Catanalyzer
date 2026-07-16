import type { TerrainType } from './types';

// ─── Editable board reference data ───────────────────────────────────────────
// Used by the board editor to offer choices and to flag "Realistic" over-counts.

/** Every terrain a tile can be set to, in display order. */
export const ALL_TERRAINS: TerrainType[] = [
  'forest', 'pasture', 'fields', 'hills', 'mountains', 'desert',
];

/** Every number token a tile can carry (no 7 — that's the robber roll). */
export const ALL_TOKENS: number[] = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

/** Tile supply of a standard 19-hex base-game board. */
export const STANDARD_TERRAIN_COUNTS: Record<TerrainType, number> = {
  forest: 4,
  pasture: 4,
  fields: 4,
  hills: 3,
  mountains: 3,
  desert: 1,
};

/** Number-token supply of a standard base-game board. */
export const STANDARD_TOKEN_COUNTS: Record<number, number> = {
  2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1,
};

/** Human-facing terrain names (matches the labels used on tiles). */
export const TERRAIN_LABEL: Record<TerrainType, string> = {
  forest: 'Forest',
  pasture: 'Pasture',
  fields: 'Fields',
  hills: 'Hills',
  mountains: 'Mountains',
  desert: 'Desert',
};

export type BoardMode = 'realistic' | 'free';

/** Tally how many tiles currently use each terrain. */
export function countTerrains(terrains: TerrainType[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of terrains) counts[t] = (counts[t] ?? 0) + 1;
  return counts;
}

/** Tally how many tiles currently use each (non-null) token. */
export function countTokens(tokens: (number | null)[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const t of tokens) if (t !== null) counts[t] = (counts[t] ?? 0) + 1;
  return counts;
}

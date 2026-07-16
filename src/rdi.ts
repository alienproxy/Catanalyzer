import type { GameState, PlayerColor, ResourceType, TerrainType } from './types';
import { TERRAIN_TO_RESOURCE } from './types';

// ─── Resource Diversification Index (RDI) ────────────────────────────────────
//
// Quantitative framework:
//   RDI = w1·C + w2·S + w3·H          (w1=0.40, w2=0.40, w3=0.20)
//
//   C  Portfolio Coverage   = U / 5          (U = unique resources with pips)
//   S  Build-Pair Synergy   = S_raw / P_total
//       S_raw = min(Wood,Brick) + min(Wheat,Ore) + min(Wheat,Sheep)
//   H  Income Entropy        = normalized Shannon entropy of pips across dice numbers
//
// "Pips" = dice-probability dots on a token: min(n-1, 13-n).  A city produces at
// double rate, so it contributes double pips (matches the app's dice payouts).
// Desert / robber contribute nothing structural and are ignored.

export const RDI_WEIGHTS = { C: 0.40, S: 0.40, H: 0.20 } as const;

/** Active dice numbers (7 is excluded — that's the robber roll). |N| = 10. */
export const ACTIVE_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

/** Framework resource order R = {Wood, Brick, Wheat, Ore, Sheep} → app resource keys. */
const RESOURCE_KEYS: ResourceType[] = ['lumber', 'wool', 'grain', 'brick', 'ore'];

/** Dice-probability dots for a token (0 for none). */
export function pipCount(token: number | null): number {
  return token === null ? 0 : Math.min(token - 1, 13 - token);
}

export interface PipProfile {
  /** Pips per resource, keyed by app resource type. */
  pr: Record<ResourceType, number>;
  /** Pips per dice number. */
  pn: Record<number, number>;
  /** P_total = Σ pr. */
  total: number;
}

/** Parse a player's placements into resource-pips (p_r) and number-pips (p_n). */
export function computePipProfile(state: GameState, color: PlayerColor): PipProfile {
  const pr: Record<ResourceType, number> = { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 };
  const pn: Record<number, number> = {};
  const hexById = new Map(state.hexes.map((h) => [h.id, h]));

  for (const v of state.vertices.values()) {
    if (v.owner !== color || !v.building) continue;
    const weight = v.building === 'city' ? 2 : 1;

    for (const hexId of v.adjacentHexIds) {
      const hex = hexById.get(hexId);
      if (!hex || hex.terrain === 'desert' || hex.token === null) continue;

      const pips = pipCount(hex.token) * weight;
      const resource = TERRAIN_TO_RESOURCE[hex.terrain as Exclude<TerrainType, 'desert'>];
      pr[resource] += pips;
      pn[hex.token] = (pn[hex.token] ?? 0) + pips;
    }
  }

  const total = RESOURCE_KEYS.reduce((sum, r) => sum + pr[r], 0);
  return { pr, pn, total };
}

export interface RDIResult {
  // Component A — Portfolio Coverage
  U: number;
  C: number;
  // Component B — Build-Pair Synergy
  vRoad: number;   // min(Wood, Brick)
  vScale: number;  // min(Wheat, Ore)
  vFlex: number;   // min(Wheat, Sheep)
  sRaw: number;
  S: number;
  // Component C — Income Entropy
  H: number;
  // Composite
  rdi: number;
  total: number;
}

/** Compute C, S, H and the composite RDI from a pip profile. */
export function computeRDI(profile: PipProfile): RDIResult {
  const { pr, pn, total } = profile;

  // ── Component A: Portfolio Coverage ──
  const U = RESOURCE_KEYS.filter((r) => pr[r] > 0).length;
  const C = U / 5;

  // ── Component B: Build-Pair Synergy ──
  const vRoad = Math.min(pr.lumber, pr.brick);  // Wood + Brick
  const vScale = Math.min(pr.grain, pr.ore);    // Wheat + Ore
  const vFlex = Math.min(pr.grain, pr.wool);    // Wheat + Sheep
  const sRaw = vRoad + vScale + vFlex;
  const S = total > 0 ? sRaw / total : 0;

  // ── Component C: normalized Shannon entropy across dice numbers ──
  let H = 0;
  if (total > 0) {
    let acc = 0;
    for (const n of ACTIVE_NUMBERS) {
      const pips = pn[n] ?? 0;
      if (pips <= 0) continue; // 0·ln0 ≡ 0
      const pi = pips / total;
      acc += pi * Math.log(pi);
    }
    H = -acc / Math.log(ACTIVE_NUMBERS.length);
  }

  const rdi = RDI_WEIGHTS.C * C + RDI_WEIGHTS.S * S + RDI_WEIGHTS.H * H;
  return { U, C, vRoad, vScale, vFlex, sRaw, S, H, rdi, total };
}

/** Short qualitative read on the position's structural integrity. */
export function assessRDI(r: RDIResult): { grade: string; detail: string } {
  if (r.total === 0) {
    return { grade: '—', detail: 'No settlements placed yet.' };
  }

  const notes: string[] = [];
  if (r.U <= 2) notes.push('narrow resource base');
  else if (r.U === 5) notes.push('full 5-resource coverage');
  else notes.push(`${r.U}/5 resources`);

  if (r.S < 0.15) notes.push('pips barely pair into recipes');
  else if (r.S >= 0.30) notes.push('strong build-pair synergy');

  if (r.H < 0.5) notes.push('income concentrated on few numbers (bursty)');
  else if (r.H >= 0.8) notes.push('income well spread across the dice');

  let grade: string;
  if (r.rdi < 0.35) grade = 'Fragile';
  else if (r.rdi < 0.50) grade = 'Developing';
  else if (r.rdi < 0.65) grade = 'Solid';
  else grade = 'Excellent';

  return { grade, detail: notes.join('; ') + '.' };
}

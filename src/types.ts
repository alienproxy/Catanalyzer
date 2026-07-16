// ─── Terrain & Resources ───────────────────────────────────────────────────

export type TerrainType =
  | 'forest'    // produces Lumber
  | 'pasture'   // produces Wool
  | 'fields'    // produces Grain
  | 'hills'     // produces Brick
  | 'mountains' // produces Ore
  | 'desert';

export type ResourceType = 'lumber' | 'wool' | 'grain' | 'brick' | 'ore';

export const TERRAIN_TO_RESOURCE: Record<Exclude<TerrainType, 'desert'>, ResourceType> = {
  forest: 'lumber',
  pasture: 'wool',
  fields: 'grain',
  hills: 'brick',
  mountains: 'ore',
};

// ─── Board Geometry ────────────────────────────────────────────────────────

/** Axial hex coordinate (Red Blob Games convention). */
export interface AxialCoord {
  q: number;
  r: number;
}

/** A single terrain tile on the board. */
export interface Hex extends AxialCoord {
  id: string;           // `${q},${r}`
  terrain: TerrainType;
  token: number | null; // 2–12; null for desert
  hasRobber: boolean;
}

/** A point where up to three hexes meet. Holds settlements / cities. */
export interface Vertex {
  id: string;           // `vx${Math.round(x*10)}_${Math.round(y*10)}`
  x: number;            // pixel position in SVG space
  y: number;
  adjacentHexIds: string[];
  adjacentEdgeIds: string[];
  building: 'settlement' | 'city' | null;
  owner: PlayerColor | null;
}

/** A border shared by two hexes / two vertices. Holds roads. */
export interface Edge {
  id: string;           // sorted vertex-id pair: `${vA}--${vB}`
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  vertexIds: [string, string];
  adjacentHexIds: string[];
  road: boolean;
  owner: PlayerColor | null;
}

// ─── Players ───────────────────────────────────────────────────────────────

export type PlayerColor = 'red' | 'blue' | 'orange' | 'white';

export interface PlayerResources {
  lumber: number;
  wool: number;
  grain: number;
  brick: number;
  ore: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  resources: PlayerResources;
  victoryPoints: number;
}

// ─── Ports ─────────────────────────────────────────────────────────────────

export type PortType = ResourceType | 'generic';

export interface Port {
  id: string;
  type: PortType;
  ratio: 2 | 3;
  vertexIds: [string, string];
  /** Precomputed pixel positions for rendering (avoids passing vertex map to overlay). */
  v1x: number; v1y: number;
  v2x: number; v2y: number;
  /** Dock marker position — edge midpoint offset outward into the sea. */
  dockX: number; dockY: number;
}

// ─── Placement ─────────────────────────────────────────────────────────────

export type PlacementMode = 'settlement' | 'city' | null;

// ─── Game State ────────────────────────────────────────────────────────────

export interface DiceRoll {
  die1: number;
  die2: number;
  sum: number;
  timestamp: number;
}

export type GamePhase = 'setup' | 'main' | 'ended';

export interface GameState {
  hexes: Hex[];
  vertices: Map<string, Vertex>;
  edges: Map<string, Edge>;
  ports: Port[];
  players: Player[];
  currentPlayerId: string;
  phase: GamePhase;
  diceRolls: DiceRoll[];
  lastRoll: DiceRoll | null;
  robberHexId: string | null;
  /** Which hex, vertex, or edge id is currently selected by the user. */
  selectedId: string | null;
}

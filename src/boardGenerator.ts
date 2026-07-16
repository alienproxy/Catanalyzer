import type { Hex, Vertex, Edge, Port, PortType } from './types';
import { axialToPixel, hexCorners, vertexKey, edgeKey, standardBoardCoords, HEX_SIZE } from './utils/hexMath';

// ─── Standard tile pool ────────────────────────────────────────────────────

const TERRAIN_POOL = [
  ...Array(4).fill('forest'),
  ...Array(4).fill('pasture'),
  ...Array(4).fill('fields'),
  ...Array(3).fill('hills'),
  ...Array(3).fill('mountains'),
  'desert',
] as const;

// Standard Catan number tokens (spiral placement order, no 7)
const TOKEN_POOL = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Board generator ───────────────────────────────────────────────────────

// ─── Port definitions ──────────────────────────────────────────────────────
// Each entry: the land hex (q,r), the outward neighbor direction (dq,dr),
// and the port type+ratio.  All (q+dq, r+dr) positions are verified off-board.

const PORT_DEFS: { q: number; r: number; dq: number; dr: number; type: PortType; ratio: 2 | 3 }[] = [
  { q:  0, r: -2, dq:  0, dr: -1, type: 'ore',     ratio: 2 }, // top
  { q:  1, r: -2, dq:  1, dr: -1, type: 'generic',  ratio: 3 }, // top-right
  { q:  2, r: -1, dq:  1, dr: -1, type: 'wool',     ratio: 2 }, // upper-right
  { q:  2, r:  0, dq:  1, dr:  0, type: 'generic',  ratio: 3 }, // right
  { q:  1, r:  1, dq:  0, dr:  1, type: 'brick',    ratio: 2 }, // lower-right
  { q: -1, r:  2, dq:  0, dr:  1, type: 'generic',  ratio: 3 }, // bottom
  { q: -2, r:  2, dq: -1, dr:  1, type: 'grain',    ratio: 2 }, // lower-left
  { q: -2, r:  0, dq: -1, dr:  0, type: 'generic',  ratio: 3 }, // left
  { q: -1, r: -1, dq:  0, dr: -1, type: 'lumber',   ratio: 2 }, // upper-left
];

// Axial neighbor direction → corner index pair [i, j] of that face.
// Corner angles: 0=top(-90°), 1=TR(-30°), 2=BR(30°), 3=bot(90°), 4=BL(150°), 5=TL(210°)
const DIR_TO_CORNERS: Record<string, [number, number]> = {
  '1,-1':  [0, 1],
  '1,0':   [1, 2],
  '0,1':   [2, 3],
  '-1,1':  [3, 4],
  '-1,0':  [4, 5],
  '0,-1':  [5, 0],
};

const DOCK_OFFSET = HEX_SIZE * 0.42; // px outward beyond the coastal edge

export interface BoardData {
  hexes: Hex[];
  vertices: Map<string, Vertex>;
  edges: Map<string, Edge>;
  ports: Port[];
  robberHexId: string;
}

export function generateBoard(randomize = true): BoardData {
  const coords = standardBoardCoords();
  const terrains = randomize ? shuffle([...TERRAIN_POOL]) : [...TERRAIN_POOL];

  // Assign tokens to non-desert tiles
  const tokens = randomize ? shuffle([...TOKEN_POOL]) : [...TOKEN_POOL];
  let tokenIndex = 0;

  const hexes: Hex[] = coords.map((coord, i) => {
    const terrain = terrains[i];
    const isDesert = terrain === 'desert';
    return {
      ...coord,
      id: `${coord.q},${coord.r}`,
      terrain,
      token: isDesert ? null : tokens[tokenIndex++],
      hasRobber: isDesert,
    };
  });

  const robberHexId = hexes.find((h) => h.terrain === 'desert')!.id;

  // ─── Build vertex & edge maps ────────────────────────────────────────────

  const vertexMap = new Map<string, Vertex>();
  const edgeMap = new Map<string, Edge>();

  for (const hex of hexes) {
    const { x: cx, y: cy } = axialToPixel(hex.q, hex.r, HEX_SIZE);
    const corners = hexCorners(cx, cy, HEX_SIZE);
    const cornerIds = corners.map((c) => vertexKey(c.x, c.y));

    // Register / update vertices
    cornerIds.forEach((vid, idx) => {
      if (!vertexMap.has(vid)) {
        vertexMap.set(vid, {
          id: vid,
          x: corners[idx].x,
          y: corners[idx].y,
          adjacentHexIds: [],
          adjacentEdgeIds: [],
          building: null,
          owner: null,
        });
      }
      const v = vertexMap.get(vid)!;
      if (!v.adjacentHexIds.includes(hex.id)) v.adjacentHexIds.push(hex.id);
    });

    // Register edges (each hex has 6 edges between consecutive corner pairs)
    for (let i = 0; i < 6; i++) {
      const vA = cornerIds[i];
      const vB = cornerIds[(i + 1) % 6];
      const eid = edgeKey(vA, vB);

      if (!edgeMap.has(eid)) {
        edgeMap.set(eid, {
          id: eid,
          x1: corners[i].x,
          y1: corners[i].y,
          x2: corners[(i + 1) % 6].x,
          y2: corners[(i + 1) % 6].y,
          vertexIds: [vA, vB],
          adjacentHexIds: [],
          road: false,
          owner: null,
        });
      }
      const e = edgeMap.get(eid)!;
      if (!e.adjacentHexIds.includes(hex.id)) e.adjacentHexIds.push(hex.id);

      // Back-link edge into both vertices
      const vAObj = vertexMap.get(vA)!;
      const vBObj = vertexMap.get(vB)!;
      if (!vAObj.adjacentEdgeIds.includes(eid)) vAObj.adjacentEdgeIds.push(eid);
      if (!vBObj.adjacentEdgeIds.includes(eid)) vBObj.adjacentEdgeIds.push(eid);
    }
  }

  // ─── Build ports ────────────────────────────────────────────────────────

  const ports: Port[] = PORT_DEFS.map((def, i) => {
    const { x: cx, y: cy } = axialToPixel(def.q, def.r, HEX_SIZE);
    const corners = hexCorners(cx, cy, HEX_SIZE);
    const [ci, cj] = DIR_TO_CORNERS[`${def.dq},${def.dr}`];
    const c0 = corners[ci];
    const c1 = corners[cj];

    const mx = (c0.x + c1.x) / 2;
    const my = (c0.y + c1.y) / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const len = Math.sqrt(dx * dx + dy * dy);

    return {
      id: `port_${i}`,
      type: def.type,
      ratio: def.ratio,
      vertexIds: [vertexKey(c0.x, c0.y), vertexKey(c1.x, c1.y)],
      v1x: c0.x, v1y: c0.y,
      v2x: c1.x, v2y: c1.y,
      dockX: mx + (dx / len) * DOCK_OFFSET,
      dockY: my + (dy / len) * DOCK_OFFSET,
    };
  });

  return { hexes, vertices: vertexMap, edges: edgeMap, ports, robberHexId };
}

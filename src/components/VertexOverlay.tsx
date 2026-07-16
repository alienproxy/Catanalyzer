import { useState } from 'react';
import type { Vertex, PlayerColor, PlacementMode } from '../types';

// ─── Per-player colour palette ─────────────────────────────────────────────

const FILL: Record<PlayerColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  white: '#f1f5f9',
};

const STROKE: Record<PlayerColor, string> = {
  red: '#7f1d1d',
  blue: '#1e3a8a',
  orange: '#431407',
  white: '#4b5563',
};

// ─── Props ─────────────────────────────────────────────────────────────────

interface VertexOverlayProps {
  vertices: Vertex[];
  selectedId: string | null;
  placementMode: PlacementMode;
  validPlacementIds: Set<string>;
  activePlayerColor: PlayerColor;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function VertexOverlay({
  vertices,
  selectedId,
  placementMode,
  validPlacementIds,
  activePlayerColor,
  onSelect,
  onDelete,
}: VertexOverlayProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {vertices.map((v) => {
        const isHovered = hoveredId === v.id;
        const isSelected = selectedId === v.id;
        const hasBuilding = v.building !== null;
        const isValid = placementMode !== null && validPlacementIds.has(v.id);

        return (
          <g key={v.id}>
            {/* ── Hit area ── */}
            <circle
              cx={v.x}
              cy={v.y}
              r={14}
              fill="transparent"
              style={{ cursor: placementMode && isValid ? 'cell' : 'pointer' }}
              onMouseEnter={() => setHoveredId(v.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                console.log(
                  `Vertex → id:${v.id}  pos:(${v.x.toFixed(1)},${v.y.toFixed(1)})  ` +
                  `hexes:[${v.adjacentHexIds.join(',')}]  building:${v.building ?? 'none'}  owner:${v.owner ?? '—'}`
                );
                onSelect(v.id);
              }}
            />

            {/* ── Valid-placement ring (no building yet) ── */}
            {isValid && !hasBuilding && (
              <circle
                cx={v.x}
                cy={v.y}
                r={isHovered ? 10 : 7}
                fill={isHovered ? `${FILL[activePlayerColor]}44` : 'rgba(74,222,128,0.15)'}
                stroke={isHovered ? FILL[activePlayerColor] : '#4ade80'}
                strokeWidth={isHovered ? 2 : 1.5}
                strokeDasharray={isHovered ? 'none' : '4 2'}
                pointerEvents="none"
                style={{ transition: 'r 0.1s' }}
              />
            )}

            {/* ── Hover ghost preview (placement mode, valid, no building) ── */}
            {isValid && !hasBuilding && isHovered && (
              <g opacity={0.55} pointerEvents="none">
                {placementMode === 'settlement'
                  ? <SettlementSVG cx={v.x} cy={v.y} fill={FILL[activePlayerColor]} stroke={STROKE[activePlayerColor]} selected={false} />
                  : <CitySVG cx={v.x} cy={v.y} fill={FILL[activePlayerColor]} stroke={STROKE[activePlayerColor]} selected={false} />
                }
              </g>
            )}

            {/* ── Placed building ── */}
            {hasBuilding && v.owner && (
              v.building === 'settlement'
                ? <SettlementSVG cx={v.x} cy={v.y} fill={FILL[v.owner]} stroke={STROKE[v.owner]} selected={isSelected} />
                : <CitySVG      cx={v.x} cy={v.y} fill={FILL[v.owner]} stroke={STROKE[v.owner]} selected={isSelected} />
            )}

            {/* ── Empty-vertex dot (only when not in placement mode) ── */}
            {!hasBuilding && !placementMode && (
              <circle
                cx={v.x}
                cy={v.y}
                r={isHovered || isSelected ? 6 : 3.5}
                fill={isSelected ? '#fff' : isHovered ? '#facc15' : 'rgba(255,255,255,0.55)'}
                stroke="#222"
                strokeWidth={1}
                pointerEvents="none"
                style={{ transition: 'r 0.1s' }}
              />
            )}

            {/* ── City-upgrade indicator ── */}
            {isValid && hasBuilding && v.building === 'settlement' && (
              <circle
                cx={v.x}
                cy={v.y}
                r={isHovered ? 18 : 15}
                fill="none"
                stroke={isHovered ? '#a78bfa' : '#7c3aed'}
                strokeWidth={2}
                strokeDasharray="4 3"
                pointerEvents="none"
                style={{ transition: 'r 0.1s' }}
              />
            )}

            {/* ── Delete popover (selected building, not in placement mode) ── */}
            {hasBuilding && isSelected && !placementMode && (
              <g
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onDelete(v.id); }}
              >
                <rect
                  x={v.x - 32} y={v.y - 56}
                  width={64} height={22}
                  rx={5}
                  fill="#1f2937" stroke="#ef4444" strokeWidth={1.4}
                />
                {/* Caret pointing down to the building */}
                <polygon
                  points={`${v.x - 5},${v.y - 34} ${v.x + 5},${v.y - 34} ${v.x},${v.y - 28}`}
                  fill="#1f2937" stroke="#ef4444" strokeWidth={1.4}
                  strokeLinejoin="round"
                />
                <text
                  x={v.x} y={v.y - 41}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  fill="#ef4444"
                  pointerEvents="none"
                >
                  ✕ Remove
                </text>
              </g>
            )}
          </g>
        );
      })}
    </>
  );
}

// ─── Settlement SVG icon ───────────────────────────────────────────────────
//
//      /\
//     /  \   ← peaked roof (triangle)
//    /    \
//   /______\
//   |  []  | ← body with door
//   |______|
//
// Bbox ≈ 22 w × 26 h, centered at (cx, cy − 4) so base near vertex point.

interface BuildingProps {
  cx: number;
  cy: number;
  fill: string;
  stroke: string;
  selected: boolean;
}

function SettlementSVG({ cx, cy, fill, stroke, selected }: BuildingProps) {
  // Shift up so the base rests at/near the vertex point
  const dy = -6;
  return (
    <g transform={`translate(${cx},${cy + dy})`} pointerEvents="none">
      {/* Selection halo */}
      {selected && (
        <circle r={16} fill="none" stroke="#facc15" strokeWidth={2.5} opacity={0.9} />
      )}

      {/* Roof */}
      <polygon
        points="0,-16 -11,-4 11,-4"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* Chimney */}
      <rect x={4} y={-19} width={3} height={7} fill={fill} stroke={stroke} strokeWidth={1.2} />

      {/* Body */}
      <rect
        x={-11} y={-4} width={22} height={14}
        fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round"
      />

      {/* Door */}
      <rect
        x={-3.5} y={2} width={7} height={8}
        fill="rgba(0,0,0,0.28)" rx={1}
      />

      {/* Left window */}
      <rect
        x={-9} y={-2} width={4} height={4}
        fill="rgba(255,255,255,0.35)" stroke={stroke} strokeWidth={0.8} rx={0.5}
      />
    </g>
  );
}

// ─── City SVG icon ─────────────────────────────────────────────────────────
//
//   __|___
//  |  |  |
//  |  |  |___     ← tall keep (left) + lower hall (right)
//  |  |  | | |
//  |  |  | | |
//  +--+--+-+-+
//
// Bbox ≈ 26 w × 32 h, centered at (cx, cy − 6).

function CitySVG({ cx, cy, fill, stroke, selected }: BuildingProps) {
  const dy = -8;
  return (
    <g transform={`translate(${cx},${cy + dy})`} pointerEvents="none">
      {selected && (
        <circle r={20} fill="none" stroke="#facc15" strokeWidth={2.5} opacity={0.9} />
      )}

      {/* ── Main keep (tall, left side) ── */}
      <rect
        x={-13} y={-18} width={14} height={28}
        fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round"
      />
      {/* Keep battlements – 3 merlons */}
      <rect x={-13} y={-24} width={3.5} height={6} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <rect x={-7.5} y={-24} width={3.5} height={6} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <rect x={-2} y={-24} width={3.5} height={6} fill={fill} stroke={stroke} strokeWidth={1.2} />
      {/* Arrow slit */}
      <rect
        x={-8} y={-14} width={3} height={8}
        fill="rgba(0,0,0,0.32)" rx={0.5}
      />
      {/* Keep gate */}
      <rect
        x={-6} y={1} width={5} height={9}
        fill="rgba(0,0,0,0.28)" rx={1}
      />

      {/* ── Lower hall (shorter, right side) ── */}
      <rect
        x={1} y={-10} width={12} height={20}
        fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round"
      />
      {/* Hall battlements – 2 merlons */}
      <rect x={1} y={-15} width={3.5} height={5} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <rect x={8} y={-15} width={3.5} height={5} fill={fill} stroke={stroke} strokeWidth={1.2} />
      {/* Hall window */}
      <rect
        x={3} y={-7} width={4} height={4}
        fill="rgba(255,255,255,0.3)" stroke={stroke} strokeWidth={0.8} rx={0.5}
      />
      {/* Hall gate */}
      <rect
        x={4} y={2} width={5} height={8}
        fill="rgba(0,0,0,0.28)" rx={1}
      />
    </g>
  );
}

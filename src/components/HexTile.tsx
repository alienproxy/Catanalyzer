import type { Hex } from '../types';
import { axialToPixel, hexCorners, HEX_SIZE } from '../utils/hexMath';

// ─── Terrain visuals ───────────────────────────────────────────────────────

const TERRAIN_FILL: Record<string, string> = {
  forest: '#2d6a2d',
  pasture: '#8ecf4e',
  fields: '#f5c842',
  hills: '#cc6633',
  mountains: '#888888',
  desert: '#e8d5a0',
};

const TERRAIN_LABEL: Record<string, string> = {
  forest: 'Lumber',
  pasture: 'Sheep',
  fields: 'Wheat',
  hills: 'Brick',
  mountains: 'Ore',
  desert: 'Desert',
};

const HIGH_PROBABILITY = new Set([6, 8]);

interface HexTileProps {
  hex: Hex;
  isHighlighted: boolean;
  isSelected: boolean;
  onClick: (hex: Hex) => void;
}

export function HexTile({ hex, isHighlighted, isSelected, onClick }: HexTileProps) {
  const { x: cx, y: cy } = axialToPixel(hex.q, hex.r, HEX_SIZE);
  const corners = hexCorners(cx, cy, HEX_SIZE);
  const points = corners.map((c) => `${c.x},${c.y}`).join(' ');
  const fill = TERRAIN_FILL[hex.terrain] ?? '#ccc';

  return (
    <g
      className="cursor-pointer"
      onClick={() => {
        console.log(`Hex clicked → id: ${hex.id}  q: ${hex.q}  r: ${hex.r}  terrain: ${hex.terrain}  token: ${hex.token}`);
        onClick(hex);
      }}
    >
      {/* Base polygon */}
      <polygon
        points={points}
        fill={fill}
        stroke={isSelected ? '#ffffff' : isHighlighted ? '#ffe066' : '#5a3e1b'}
        strokeWidth={isSelected ? 3.5 : isHighlighted ? 3 : 1.5}
        opacity={isHighlighted ? 1 : 0.92}
      />

      {/* Highlight overlay for dice match */}
      {isHighlighted && (
        <polygon
          points={points}
          fill="#ffe066"
          opacity={0.22}
          pointerEvents="none"
        />
      )}

      {/* Terrain label (small, bottom) */}
      <text
        x={cx}
        y={cy + HEX_SIZE * 0.55}
        textAnchor="middle"
        fontSize={10}
        fill="rgba(0,0,0,0.55)"
        fontFamily="sans-serif"
        pointerEvents="none"
      >
        {TERRAIN_LABEL[hex.terrain]}
      </text>

      {/* Number token circle */}
      {hex.token !== null && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={18}
            fill="ivory"
            stroke="#8b6914"
            strokeWidth={1.5}
            pointerEvents="none"
          />
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={HIGH_PROBABILITY.has(hex.token) ? 17 : 14}
            fontWeight={HIGH_PROBABILITY.has(hex.token) ? 'bold' : 'normal'}
            fill={HIGH_PROBABILITY.has(hex.token) ? '#cc0000' : '#1a1a1a'}
            fontFamily="serif"
            pointerEvents="none"
          >
            {hex.token}
          </text>
          {/* Probability dots under number */}
          <DotRow cx={cx} cy={cy + 12} token={hex.token} />
        </>
      )}

      {/* Robber */}
      {hex.hasRobber && (
        <text
          x={cx}
          y={cy - HEX_SIZE * 0.25}
          textAnchor="middle"
          fontSize={22}
          pointerEvents="none"
        >
          🏴
        </text>
      )}
    </g>
  );
}

// ─── Probability dots (like real Catan tokens) ─────────────────────────────

function DotRow({ cx, cy, token }: { cx: number; cy: number; token: number }) {
  // dots = min(token-1, 13-token) → 1..5
  const dots = Math.min(token - 1, 13 - token);
  const spacing = 5;
  const startX = cx - ((dots - 1) * spacing) / 2;
  return (
    <>
      {Array.from({ length: dots }, (_, i) => (
        <circle
          key={i}
          cx={startX + i * spacing}
          cy={cy}
          r={1.8}
          fill={token === 6 || token === 8 ? '#cc0000' : '#444'}
          pointerEvents="none"
        />
      ))}
    </>
  );
}

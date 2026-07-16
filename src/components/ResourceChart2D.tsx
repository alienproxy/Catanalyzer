/**
 * Grouped bar chart — Resource counts per player.
 * X axis: resource type (5 groups)
 * Within each group: one bar per player, colored by player
 * Y axis: resource amount
 */

import { useMemo } from 'react';
import type { Player, PlayerColor, ResourceType } from '../types';

const RESOURCES: { type: ResourceType; label: string; color: string }[] = [
  { type: 'lumber', label: 'Lumber', color: '#22c55e' },
  { type: 'wool',   label: 'Wool',   color: '#0ea5e9' },
  { type: 'grain',  label: 'Grain',  color: '#eab308' },
  { type: 'brick',  label: 'Brick',  color: '#ef4444' },
  { type: 'ore',    label: 'Ore',    color: '#64748b' },
];

const PLAYER_FILL: Record<PlayerColor, string> = {
  red: '#f87171', blue: '#60a5fa', orange: '#fb923c', white: '#e2e8f0',
};

interface ResourceChart2DProps {
  players: Player[];
}

// Fixed coordinate system — SVG scales via viewBox + width="100%"
const VW = 390, VH = 200;
const ML = 40, MT = 16, MR = 10, MB = 54;
const iW = VW - ML - MR;   // inner width  = 340
const iH = VH - MT - MB;   // inner height = 130

export function ResourceChart2D({ players }: ResourceChart2DProps) {
  const maxVal = useMemo(
    () => Math.max(8, ...players.flatMap((p) => Object.values(p.resources))),
    [players],
  );

  const numR = RESOURCES.length;   // 5
  const numP = players.length;     // up to 4

  const groupW    = iW / numR;                            // px per resource group
  const barAreaW  = groupW - 10;                          // minus inter-group gap
  const barGap    = 2;                                    // px gap between player bars
  const barW      = (barAreaW - barGap * (numP - 1)) / numP;

  const tickStep  = maxVal <= 10 ? 2 : maxVal <= 20 ? 5 : 10;
  const ticks: number[] = [];
  for (let v = 0; v <= maxVal; v += tickStep) ticks.push(v);

  const yScale = (v: number) => iH * (1 - v / maxVal);

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      style={{ display: 'block' }}
      aria-label="Resource chart 2D"
    >
      <g transform={`translate(${ML},${MT})`}>

        {/* ── Gridlines + Y axis ── */}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={0} y1={yScale(v)} x2={iW} y2={yScale(v)}
              stroke={v === 0 ? '#374151' : '#1f2937'}
              strokeWidth={v === 0 ? 1 : 0.8}
              strokeDasharray={v === 0 ? '' : '3 3'}
            />
            <text
              x={-6} y={yScale(v) + 3}
              textAnchor="end" fontSize={8} fill="#6b7280" fontFamily="monospace"
            >
              {v}
            </text>
          </g>
        ))}
        <line x1={0} y1={0} x2={0} y2={iH} stroke="#4b5563" strokeWidth={1} />

        {/* ── Bars ── */}
        {RESOURCES.map((res, ri) => {
          const groupX = ri * groupW + 5;   // 5 = half of inter-group gap
          return players.map((player, pi) => {
            const val = player.resources[res.type];
            const bH  = (val / maxVal) * iH;
            const bX  = groupX + pi * (barW + barGap);
            const bY  = yScale(val);
            return (
              <g key={`${ri}-${pi}`}>
                {/* Zero stub so every player slot is visible */}
                <rect
                  x={bX}
                  y={val > 0 ? bY : iH - 2}
                  width={barW}
                  height={val > 0 ? bH : 2}
                  fill={PLAYER_FILL[player.color]}
                  rx={1.5}
                  opacity={val > 0 ? 1 : 0.18}
                />
                {/* Value label inside bar when tall enough */}
                {val > 0 && bH >= 16 && (
                  <text
                    x={bX + barW / 2} y={bY + 9}
                    textAnchor="middle" fontSize={7} fontFamily="monospace" fontWeight="bold"
                    fill="rgba(0,0,0,0.55)"
                  >
                    {val}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* ── Resource labels under X axis ── */}
        {RESOURCES.map((res, ri) => (
          <text
            key={res.type}
            x={ri * groupW + groupW / 2} y={iH + 13}
            textAnchor="middle" fontSize={9}
            fontFamily="sans-serif" fontWeight="bold"
            fill={res.color}
          >
            {res.label}
          </text>
        ))}

        {/* ── Player legend ── */}
        {players.map((player, pi) => {
          const lx = (pi + 0.5) * (iW / numP) - 30;
          return (
            <g key={player.id} transform={`translate(${lx},${iH + 27})`}>
              <rect x={0} y={0} width={10} height={10} fill={PLAYER_FILL[player.color]} rx={1.5} />
              <text x={14} y={8.5} fontSize={9} fontFamily="sans-serif" fill="#d1d5db">
                {player.name}
              </text>
            </g>
          );
        })}

      </g>
    </svg>
  );
}

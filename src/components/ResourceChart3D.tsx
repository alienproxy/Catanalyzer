/**
 * Isometric 3D bar chart — Resource counts per player.
 * Drag horizontally to rotate around the Y axis.
 *
 * Axes
 *   X (world) → resource type  (0 … 4)
 *   Z (world) → player index   (0 … 3)
 *   Y (world) → resource amount
 *
 * Projection (orthographic, rotatable by azimuth θ):
 *   rx = wx·cos(θ) − wz·sin(θ)
 *   rz = wx·sin(θ) + wz·cos(θ)
 *   sx = (rx − rz) · K
 *   sy = (rx + rz) · D − wy · H
 */

import { useMemo, useRef, useState, useCallback, type ReactElement } from 'react';
import type { Player, PlayerColor, ResourceType } from '../types';

// ─── Projection constants ──────────────────────────────────────────────────

const K   = 30;     // screen-X scale per world unit
const D   = 15;     // screen-Y depth scale per world unit
const BAR = 0.74;   // bar footprint fraction of one cell
const PAD = (1 - BAR) / 2;

// ─── Resource palette ──────────────────────────────────────────────────────
// Three shades per resource: [top-face, front-face, side-face]

const RESOURCES: {
  type: ResourceType;
  label: string;
  shades: readonly [string, string, string];
}[] = [
  { type: 'lumber', label: 'Lumber', shades: ['#86efac', '#22c55e', '#14532d'] },
  { type: 'wool',   label: 'Wool',   shades: ['#bae6fd', '#0ea5e9', '#0c4a6e'] },
  { type: 'grain',  label: 'Grain',  shades: ['#fef08a', '#eab308', '#713f12'] },
  { type: 'brick',  label: 'Brick',  shades: ['#fca5a5', '#ef4444', '#7f1d1d'] },
  { type: 'ore',    label: 'Ore',    shades: ['#cbd5e1', '#64748b', '#0f172a'] },
] as const;

const PLAYER_COLOR: Record<PlayerColor, string> = {
  red: '#f87171', blue: '#60a5fa', orange: '#fb923c', white: '#e2e8f0',
};

// ─── Projection helpers ────────────────────────────────────────────────────

function toScreen(
  wx: number, wy: number, wz: number,
  H: number, theta: number,
): [number, number] {
  const c = Math.cos(theta), s = Math.sin(theta);
  const rx = wx * c - wz * s;
  const rz = wx * s + wz * c;
  return [(rx - rz) * K, (rx + rz) * D - wy * H];
}

function poly(pts: [number, number, number][], H: number, theta: number): string {
  return pts.map(([x, y, z]) => toScreen(x, y, z, H, theta).join(',')).join(' ');
}

// ─── Single 3-D bar ────────────────────────────────────────────────────────

function Bar3D({
  col, row, height, H, theta,
  shades: [ctop, cmid, cdark],
}: {
  col: number; row: number; height: number;
  H: number; theta: number;
  shades: readonly [string, string, string];
}) {
  const x = col + PAD;
  const z = row + PAD;
  const w = BAR;
  const h = Math.max(0, height);

  // Empty-cell floor marker
  if (h < 0.5) {
    return (
      <polygon
        points={poly([[x,0,z],[x+w,0,z],[x+w,0,z+w],[x,0,z+w]], H, theta)}
        fill={cmid} opacity={0.12}
      />
    );
  }

  const [lx, ly] = toScreen(x + w / 2, h, z + w / 2, H, theta);
  const c = Math.cos(theta), s = Math.sin(theta);

  // Pick the two visible vertical faces based on camera azimuth.
  // X-direction face: +X face (wx = x+w) visible when cos(θ) ≥ sin(θ),
  //                   -X face (wx = x)   visible otherwise.
  // Z-direction face: -Z face (wz = z)   visible when cos(θ) + sin(θ) ≥ 0,
  //                   +Z face (wz = z+w) visible otherwise.
  const xFace: [number,number,number][] = (c >= s)
    ? [[x+w,0,z],[x+w,0,z+w],[x+w,h,z+w],[x+w,h,z]]
    : [[x,  0,z],[x,  0,z+w],[x,  h,z+w],[x,  h,z]];

  const zFace: [number,number,number][] = (c + s >= 0)
    ? [[x,0,z],[x+w,0,z],[x+w,h,z],[x,h,z]]
    : [[x,0,z+w],[x+w,0,z+w],[x+w,h,z+w],[x,h,z+w]];

  return (
    <g>
      {/* Side face (darker) */}
      <polygon
        points={poly(xFace, H, theta)}
        fill={cdark} stroke={cdark} strokeWidth={0.4} strokeLinejoin="round"
      />
      {/* Front face (mid-light) */}
      <polygon
        points={poly(zFace, H, theta)}
        fill={cmid} stroke={cmid} strokeWidth={0.4} strokeLinejoin="round"
      />
      {/* Top face (brightest) */}
      <polygon
        points={poly([[x,h,z],[x+w,h,z],[x+w,h,z+w],[x,h,z+w]], H, theta)}
        fill={ctop} stroke={ctop} strokeWidth={0.4} strokeLinejoin="round"
      />
      {/* Value label */}
      <text
        x={lx} y={ly - 3}
        textAnchor="middle" fontSize={7.5} fontFamily="monospace" fontWeight="bold"
        fill="rgba(255,255,255,0.95)" stroke="rgba(0,0,0,0.4)"
        strokeWidth={2} paintOrder="stroke"
      >
        {Math.round(height)}
      </text>
    </g>
  );
}

// ─── Y-axis ────────────────────────────────────────────────────────────────

function YAxis({ maxVal, H, theta }: { maxVal: number; H: number; theta: number }) {
  const [ox, oy] = toScreen(0, 0,      0, H, theta);
  const [tx, ty] = toScreen(0, maxVal, 0, H, theta);

  const tickStep = maxVal <= 10 ? 2 : maxVal <= 20 ? 5 : 10;
  const ticks: ReactElement[] = [];
  for (let v = 0; v <= maxVal; v += tickStep) {
    const [px, py] = toScreen(0, v, 0, H, theta);
    ticks.push(
      <g key={v}>
        <line x1={px} y1={py} x2={px - 6} y2={py} stroke="#4b5563" strokeWidth={0.8} />
        <text x={px - 9} y={py + 3} textAnchor="end" fontSize={8} fill="#6b7280" fontFamily="monospace">
          {v}
        </text>
      </g>,
    );
  }

  return (
    <>
      <line x1={ox} y1={oy} x2={tx} y2={ty} stroke="#4b5563" strokeWidth={1} />
      {ticks}
      <text x={tx - 12} y={ty - 6} textAnchor="middle" fontSize={8} fill="#6b7280"
        fontFamily="sans-serif" letterSpacing={0.5}>
        ▲ Amount
      </text>
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

interface ResourceChart3DProps {
  players: Player[];
}

export function ResourceChart3D({ players }: ResourceChart3DProps) {
  const numR = RESOURCES.length;
  const numP = players.length;

  const [theta, setTheta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startTheta: number } | null>(null);

  const maxVal = useMemo(
    () => Math.max(8, ...players.flatMap((p) => Object.values(p.resources))),
    [players],
  );
  const H = Math.max(5, Math.min(22, 200 / maxVal));

  // Painter's order: draw cells with higher depth (further from viewer) first.
  // Depth in world space = (ri + 0.5)·(cos θ + sin θ) + (pi + 0.5)·(cos θ − sin θ)
  const drawOrder = useMemo(() => {
    const c = Math.cos(theta), s = Math.sin(theta);
    const order: { ri: number; pi: number }[] = [];
    for (let pi = 0; pi < numP; pi++) {
      for (let ri = 0; ri < numR; ri++) order.push({ ri, pi });
    }
    order.sort((a, b) => {
      const da = (a.ri + 0.5) * (c + s) + (a.pi + 0.5) * (c - s);
      const db = (b.ri + 0.5) * (c + s) + (b.pi + 0.5) * (c - s);
      return db - da;
    });
    return order;
  }, [theta, numR, numP]);

  // Dynamic viewBox: project all 8 corners of the data region
  const { vMinX, vMinY, vW, vH } = useMemo(() => {
    const MARGIN = { top: 30, right: 64, bottom: 40, left: 76 };
    const corners: [number, number, number][] = [
      [0,0,0],[numR,0,0],[0,0,numP],[numR,0,numP],
      [0,maxVal,0],[numR,maxVal,0],[0,maxVal,numP],[numR,maxVal,numP],
    ];
    const sxs = corners.map(([x,y,z]) => toScreen(x,y,z,H,theta)[0]);
    const sys = corners.map(([x,y,z]) => toScreen(x,y,z,H,theta)[1]);
    const minX = Math.min(...sxs) - MARGIN.left;
    const maxX = Math.max(...sxs) + MARGIN.right;
    const minY = Math.min(...sys) - MARGIN.top;
    const maxY = Math.max(...sys) + MARGIN.bottom;
    return { vMinX: minX, vMinY: minY, vW: maxX - minX, vH: maxY - minY };
  }, [theta, numR, numP, maxVal, H]);

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: { clientX: number; preventDefault(): void }) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startTheta: theta };
    setIsDragging(true);
  }, [theta]);

  const handleMouseMove = useCallback((e: { clientX: number }) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    setTheta(dragRef.current.startTheta + dx * 0.012);
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <svg
      viewBox={`${vMinX} ${vMinY} ${vW} ${vH}`}
      width="100%"
      style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      aria-label="Resource chart"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Floor grid ── */}
      {Array.from({ length: numR + 1 }, (_, i) => {
        const [x1, y1] = toScreen(i, 0, 0,    H, theta);
        const [x2, y2] = toScreen(i, 0, numP, H, theta);
        return <line key={`gx${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1f2937" strokeWidth={0.8} />;
      })}
      {Array.from({ length: numP + 1 }, (_, j) => {
        const [x1, y1] = toScreen(0,    0, j, H, theta);
        const [x2, y2] = toScreen(numR, 0, j, H, theta);
        return <line key={`gz${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1f2937" strokeWidth={0.8} />;
      })}

      {/* ── Bars (painter's order) ── */}
      {drawOrder.map(({ ri, pi }) => {
        const res    = RESOURCES[ri];
        const player = players[pi];
        return player ? (
          <Bar3D
            key={`${ri}-${pi}`}
            col={ri} row={pi}
            height={player.resources[res.type]}
            H={H} theta={theta}
            shades={res.shades}
          />
        ) : null;
      })}

      {/* ── Y axis ── */}
      <YAxis maxVal={maxVal} H={H} theta={theta} />

      {/* ── Resource labels (front edge of each column) ── */}
      {RESOURCES.map((res, i) => {
        const [sx, sy] = toScreen(i + 0.5, 0, 0, H, theta);
        return (
          <text key={res.type} x={sx} y={sy + 14}
            textAnchor="middle" fontSize={9} fontFamily="sans-serif" fontWeight="bold"
            fill={res.shades[1]}
          >
            {res.label}
          </text>
        );
      })}

      {/* ── Player labels (left edge of each row) ── */}
      {players.map((player, j) => {
        const [sx, sy] = toScreen(0, 0, j + 0.5, H, theta);
        return (
          <g key={player.id}>
            <circle cx={sx - K + 4} cy={sy} r={4} fill={PLAYER_COLOR[player.color]} />
            <text x={sx - K - 2} y={sy + 3.5}
              textAnchor="end" fontSize={9} fontFamily="sans-serif"
              fill={PLAYER_COLOR[player.color]}
            >
              {player.name}
            </text>
          </g>
        );
      })}

      {/* ── Axis arrow hints ── */}
      {(() => {
        const [ax, ay] = toScreen(numR, 0, 0, H, theta);
        return <text x={ax + 6} y={ay + 4} fontSize={8} fill="#4b5563" fontFamily="sans-serif">Resources →</text>;
      })()}
      {(() => {
        const [ax, ay] = toScreen(0, 0, numP, H, theta);
        return <text x={ax + 6} y={ay + 4} fontSize={8} fill="#4b5563" fontFamily="sans-serif">← Players</text>;
      })()}

      {/* ── Drag hint ── */}
      {!isDragging && (
        <text
          x={vMinX + vW / 2} y={vMinY + 10}
          textAnchor="middle" fontSize={8} fill="#374151" fontFamily="sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          drag to rotate
        </text>
      )}
    </svg>
  );
}

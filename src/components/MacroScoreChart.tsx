/**
 * Purchasing Power — two side-by-side line charts, one per scoring metric.
 *
 * Metric A — "Max Purchases" (count):
 *   Greedy cheapest-first. Maximises the NUMBER of items bought.
 *   Order: road → dev card → settlement → city
 *
 * Metric B — "Max VP Gain" (value):
 *   Greedy most-valuable-first. Maximises VP earned from spending.
 *   Roads are excluded (0 VP). Order: city (2 VP) → settlement (1 VP) → dev card (1 VP)
 *
 * Both metrics use each player's port-adjusted bank trade ratios.
 * Charts share a Recharts syncId so hovering highlights the same turn in both.
 */

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { TurnData } from './StackedAreaChart';
import type { Player, PlayerColor } from '../types';

// ─── Player colours ────────────────────────────────────────────────────────

const PLAYER_HEX: Record<PlayerColor, string> = {
  red: '#f87171', blue: '#60a5fa', orange: '#fb923c', white: '#e2e8f0',
};

// ─── Purchase cost tables ──────────────────────────────────────────────────
// Resource index: [wood/lumber, brick, wheat/grain, sheep/wool, ore]

// Count metric: cheapest → most expensive
const COSTS_COUNT: number[][] = [
  [1, 1, 0, 0, 0],  // road        (2 res)
  [0, 0, 1, 1, 1],  // dev card    (3 res)
  [1, 1, 1, 1, 0],  // settlement  (4 res)
  [0, 0, 2, 0, 3],  // city        (5 res)
];

// VP metric: most valuable → least (roads omitted — 0 VP)
const COSTS_VP: { cost: number[]; vp: number }[] = [
  { cost: [0, 0, 2, 0, 3], vp: 2 },  // city
  { cost: [1, 1, 1, 1, 0], vp: 1 },  // settlement
  { cost: [0, 0, 1, 1, 1], vp: 1 },  // dev card
];

// ─── Bank-trade purchase attempt ───────────────────────────────────────────

function tryPurchase(res: number[], cost: number[], ratios: number[]): number[] | null {
  const r = [...res];
  for (let i = 0; i < 5; i++) {
    while (r[i] < cost[i]) {
      let traded = false;
      for (let j = 0; j < 5; j++) {
        if (j === i) continue;
        if (r[j] - cost[j] >= ratios[j]) {
          r[j] -= ratios[j];
          r[i] += 1;
          traded = true;
          break;
        }
      }
      if (!traded) return null;
    }
  }
  for (let i = 0; i < 5; i++) r[i] -= cost[i];
  return r;
}

// ─── Score functions ───────────────────────────────────────────────────────

function scoreCount(t: TurnData, ratios: number[]): number {
  let r = [t.wood, t.brick, t.wheat, t.sheep, t.ore];
  let score = 0, progress = true;
  while (progress) {
    progress = false;
    for (const cost of COSTS_COUNT) {
      const next = tryPurchase(r, cost, ratios);
      if (next) { r = next; score++; progress = true; break; }
    }
  }
  return score;
}

function scoreVP(t: TurnData, ratios: number[]): number {
  let r = [t.wood, t.brick, t.wheat, t.sheep, t.ore];
  let score = 0, progress = true;
  while (progress) {
    progress = false;
    for (const { cost, vp } of COSTS_VP) {
      const next = tryPurchase(r, cost, ratios);
      if (next) { r = next; score += vp; progress = true; break; }
    }
  }
  return score;
}

// ─── Shared tooltip ────────────────────────────────────────────────────────

interface TooltipEntry { color: string; name: string; value: number; dataKey: string }

function ChartTooltip({
  active, payload, label, unit,
}: {
  active?: boolean; payload?: TooltipEntry[]; label?: number; unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: '#111827', border: '1px solid #374151',
      borderRadius: 6, padding: '7px 10px', fontSize: 10,
    }}>
      <p style={{ color: '#e5e7eb', fontWeight: 600, marginBottom: 4 }}>Turn {label}</p>
      {payload.map((e) => (
        <p key={e.dataKey} style={{ color: e.color, margin: '1px 0' }}>
          {e.name}: <span style={{ fontWeight: 700 }}>{e.value}</span> {unit}
        </p>
      ))}
    </div>
  );
}

// ─── Mini line chart ───────────────────────────────────────────────────────

function MiniLineChart({
  title, subtitle, data, players, dataKeySuffix, yLabel, tooltipUnit,
}: {
  title: string;
  subtitle: string;
  data: Record<string, number>[];
  players: Player[];
  dataKeySuffix: string;
  yLabel: string;
  tooltipUnit: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      <p className="flex-none text-[9px] font-semibold text-center text-gray-400 leading-none mb-0.5">{title}</p>
      <p className="flex-none text-[8px] text-center text-gray-600 leading-none mb-1">{subtitle}</p>
      <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          syncId="purchasing-power"
          margin={{ top: 4, right: 6, bottom: 18, left: -16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="turn"
            tick={{ fontSize: 7, fill: '#4b5563' }}
            label={{ value: 'Turn', position: 'insideBottom', offset: -4, fontSize: 7, fill: '#4b5563' }}
          />
          <YAxis
            tick={{ fontSize: 7, fill: '#4b5563' }}
            allowDecimals={false}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', dx: 18, fontSize: 7, fill: '#4b5563' }}
          />
          <Tooltip content={<ChartTooltip unit={tooltipUnit} />} />
          {players.map((p) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={`${p.id}${dataKeySuffix}`}
              name={p.name}
              stroke={PLAYER_HEX[p.color]}
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

interface MacroScoreChartProps {
  players: Player[];
  turnHistory: Map<string, TurnData[]>;
  playerRatios: Map<string, number[]>;
}

const DEFAULT_RATIOS = [4, 4, 4, 4, 4];

export function MacroScoreChart({ players, turnHistory, playerRatios }: MacroScoreChartProps) {
  const chartData = useMemo(() => {
    const allTurns = new Set<number>();
    for (const turns of turnHistory.values()) turns.forEach((t) => allTurns.add(t.turn));
    if (allTurns.size === 0) return [];

    return [...allTurns].sort((a, b) => a - b).map((turn) => {
      const row: Record<string, number> = { turn };
      for (const player of players) {
        const td = (turnHistory.get(player.id) ?? []).find((t) => t.turn === turn);
        const ratios = playerRatios.get(player.id) ?? DEFAULT_RATIOS;
        row[`${player.id}_count`] = td ? scoreCount(td, ratios) : 0;
        row[`${player.id}_vp`]    = td ? scoreVP(td, ratios)    : 0;
      }
      return row;
    });
  }, [players, turnHistory, playerRatios]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs">
        Roll dice to begin tracking purchasing power.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-1">
      {/* Side-by-side charts — grow to fill available height */}
      <div className="flex flex-1 min-h-0 gap-2">
        <MiniLineChart
          title="Max Purchases"
          subtitle="cheapest-first · count"
          data={chartData}
          players={players}
          dataKeySuffix="_count"
          yLabel="n"
          tooltipUnit="items"
        />
        <MiniLineChart
          title="Max VP Gain"
          subtitle="city-first · victory points"
          data={chartData}
          players={players}
          dataKeySuffix="_vp"
          yLabel="VP"
          tooltipUnit="VP"
        />
      </div>

      {/* Shared legend */}
      <div className="flex-none flex justify-center gap-4 pb-1">
        {players.map((p) => (
          <span key={p.id} className="flex items-center gap-1 text-[9px]" style={{ color: PLAYER_HEX[p.color] }}>
            <span
              className="inline-block w-4 rounded"
              style={{ height: 2, backgroundColor: PLAYER_HEX[p.color] }}
            />
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}

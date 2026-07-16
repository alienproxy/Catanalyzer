import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────

export interface TurnData {
  turn:  number;
  wood:  number;
  brick: number;
  wheat: number;
  sheep: number;
  ore:   number;
}

interface Props {
  playerData:  TurnData[];
  playerName:  string;
  /** Hex colour used for the card border and header text. */
  playerColor: string;
}

// ─── Resource config ──────────────────────────────────────────────────────
// Stacked bottom → top: Wood, Brick, Wheat, Sheep, Ore

const AREAS: { key: keyof Omit<TurnData, 'turn'>; label: string; color: string }[] = [
  { key: 'wood',  label: 'Wood',  color: '#16a34a' },
  { key: 'brick', label: 'Brick', color: '#b45309' },
  { key: 'wheat', label: 'Wheat', color: '#eab308' },
  { key: 'sheep', label: 'Sheep', color: '#4ade80' },
  { key: 'ore',   label: 'Ore',   color: '#94a3b8' },
];

// ─── 30-turn simulated demo data ──────────────────────────────────────────
// Cumulative per-turn resource earnings for one player.

const RAW_GAINS: [number, number, number, number, number][] = [
  [1,0,0,2,0],[1,0,1,0,1],[0,1,0,1,0],[2,0,0,0,0],[0,1,1,1,1],
  [1,0,0,1,0],[0,0,2,0,1],[1,1,0,0,0],[0,0,0,2,0],[1,0,1,0,1],
  [0,2,0,1,0],[2,0,0,0,0],[0,0,1,1,1],[1,1,0,0,0],[0,0,2,0,0],
  [1,0,0,1,1],[0,1,1,0,0],[2,0,0,2,0],[0,0,0,0,1],[1,1,1,0,0],
  [0,0,0,1,1],[1,0,2,0,0],[0,2,0,1,0],[1,0,0,0,1],[0,1,1,1,0],
  [2,0,0,0,0],[0,0,1,1,1],[1,1,0,0,0],[0,0,2,0,1],[1,0,0,2,0],
];

export const DEMO_PLAYER_DATA: TurnData[] = (() => {
  let w = 0, b = 0, wh = 0, sh = 0, o = 0;
  return RAW_GAINS.map(([dw, db, dwh, dsh, do_], i) => {
    w += dw; b += db; wh += dwh; sh += dsh; o += do_;
    return { turn: i + 1, wood: w, brick: b, wheat: wh, sheep: sh, ore: o };
  });
})();

// ─── Component ────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  fontSize: 11,
};

export function StackedAreaChart({ playerData, playerName, playerColor }: Props) {
  if (playerData.length === 0) {
    return (
      <div
        className="rounded-lg border-2 flex items-center justify-center h-44 text-gray-600 text-xs"
        style={{ borderColor: playerColor }}
      >
        Roll dice to begin tracking {playerName}&apos;s resources
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 px-3 pt-3 pb-1 bg-gray-800/50" style={{ borderColor: playerColor }}>
      <p className="text-xs font-semibold mb-2 leading-none" style={{ color: playerColor }}>
        {playerName} — Cumulative Resources
      </p>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={playerData} margin={{ top: 4, right: 8, bottom: 18, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />

          <XAxis
            dataKey="turn"
            tick={{ fontSize: 8, fill: '#6b7280' }}
            label={{ value: 'Turn', position: 'insideBottom', offset: -4, fontSize: 9, fill: '#6b7280' }}
          />
          <YAxis
            tick={{ fontSize: 8, fill: '#6b7280' }}
            allowDecimals={false}
          />

          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: '#e5e7eb', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ padding: '1px 0', color: '#d1d5db' }}
            labelFormatter={(v) => `Turn ${v}`}
            formatter={(value, name) => {
              const label = String(name);
              return [value, label.charAt(0).toUpperCase() + label.slice(1)];
            }}
          />

          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 9, paddingTop: 6 }}
          />

          {AREAS.map(({ key, label, color }) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stackId="resources"
              stroke={color}
              fill={color}
              fillOpacity={0.6}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

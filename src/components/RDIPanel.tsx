import { useMemo } from 'react';
import type { GameState, Player, PlayerColor, ResourceType } from '../types';
import { computePipProfile, computeRDI, assessRDI } from '../rdi';

const PLAYER_BG: Record<PlayerColor, string> = {
  red: 'bg-red-500', blue: 'bg-blue-500', orange: 'bg-orange-400', white: 'bg-gray-200',
};

const GRADE_COLOR: Record<string, string> = {
  Fragile: 'text-red-400',
  Developing: 'text-amber-400',
  Solid: 'text-lime-400',
  Excellent: 'text-emerald-400',
  '—': 'text-gray-500',
};

// Framework order R = {Wood, Brick, Wheat, Ore, Sheep}
const PR_ORDER: { key: ResourceType; label: string }[] = [
  { key: 'lumber', label: 'Wd' },
  { key: 'brick',  label: 'Br' },
  { key: 'grain',  label: 'Wh' },
  { key: 'ore',    label: 'Or' },
  { key: 'wool',   label: 'Sh' },
];

interface RDIPanelProps {
  state: GameState;
  players: Player[];
}

export function RDIPanel({ state, players }: RDIPanelProps) {
  const rows = useMemo(
    () =>
      players.map((p) => {
        const profile = computePipProfile(state, p.color);
        const result = computeRDI(profile);
        const assessment = assessRDI(result);
        return { player: p, profile, result, assessment };
      }),
    [state, players],
  );

  return (
    <div className="space-y-2.5">
      {rows.map(({ player, profile, result, assessment }) => (
        <div key={player.id} className="bg-gray-800 rounded-lg p-3">
          {/* Header: player + composite RDI */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${PLAYER_BG[player.color]}`} />
            <span className="text-xs font-semibold text-gray-200 flex-1">{player.name}</span>
            <span className="text-sm font-bold tabular-nums text-amber-400" title="Resource Diversification Index (0–1)">
              {result.rdi.toFixed(3)}
            </span>
          </div>

          {result.total === 0 ? (
            <p className="text-[10px] text-gray-500 italic">{assessment.detail}</p>
          ) : (
            <>
              {/* Component breakdown */}
              <div className="grid grid-cols-3 gap-1 mb-2">
                <Component label="Coverage C" value={result.C} sub={`${result.U}/5`} />
                <Component label="Synergy S" value={result.S} sub={`${result.sRaw}/${result.total} pip`} />
                <Component label="Entropy H" value={result.H} />
              </div>

              {/* Per-resource pips (p_r) */}
              <div className="grid grid-cols-5 gap-1 mb-2">
                {PR_ORDER.map(({ key, label }) => (
                  <div key={key} className="text-center" title={`${label} pips`}>
                    <div className={`text-xs font-bold leading-none ${profile.pr[key] > 0 ? 'text-gray-200' : 'text-gray-600'}`}>
                      {profile.pr[key]}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5 leading-none">{label}</div>
                  </div>
                ))}
              </div>

              {/* Qualitative read */}
              <div className="flex items-start gap-1.5 pt-2 border-t border-gray-700/60">
                <span className={`text-[10px] font-bold flex-shrink-0 ${GRADE_COLOR[assessment.grade]}`}>
                  {assessment.grade}
                </span>
                <span className="text-[10px] text-gray-400 leading-snug">{assessment.detail}</span>
              </div>
            </>
          )}
        </div>
      ))}

      <p className="text-[9px] text-gray-600 leading-snug px-0.5">
        RDI = 0.40·C + 0.40·S + 0.20·H · pips = dice dots (cities ×2).
      </p>
    </div>
  );
}

function Component({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-gray-900/60 rounded px-1.5 py-1 text-center">
      <div className="text-xs font-bold tabular-nums text-gray-100 leading-none">{value.toFixed(2)}</div>
      <div className="text-[8px] text-gray-500 mt-0.5 leading-none">{label}</div>
      {sub && <div className="text-[8px] text-gray-600 mt-0.5 leading-none">{sub}</div>}
    </div>
  );
}

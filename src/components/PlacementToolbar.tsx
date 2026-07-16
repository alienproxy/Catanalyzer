import type { ReactNode } from 'react';
import type { Player, PlayerColor, PlacementMode } from '../types';

// ─── Colour classes (must be full Tailwind strings so purge keeps them) ────

const RING: Record<PlayerColor, string> = {
  red:    'ring-red-500',
  blue:   'ring-blue-500',
  orange: 'ring-orange-400',
  white:  'ring-gray-300',
};

const BG: Record<PlayerColor, string> = {
  red:    'bg-red-500',
  blue:   'bg-blue-500',
  orange: 'bg-orange-400',
  white:  'bg-gray-100',
};

// ─── Props ─────────────────────────────────────────────────────────────────

interface PlacementToolbarProps {
  players: Player[];
  activePlayerId: string;
  placementMode: PlacementMode;
  onPlayerChange: (id: string) => void;
  onModeChange: (mode: PlacementMode) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PlacementToolbar({
  players,
  activePlayerId,
  placementMode,
  onPlayerChange,
  onModeChange,
}: PlacementToolbarProps) {
  const activePlayer = players.find((p) => p.id === activePlayerId)!;

  function toggleMode(mode: 'settlement' | 'city') {
    onModeChange(placementMode === mode ? null : mode);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Player selector ── */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">
          Active Player
        </p>
        <div className="flex items-center gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              title={p.name}
              onClick={() => onPlayerChange(p.id)}
              className={[
                'w-8 h-8 rounded-full transition-all duration-150',
                BG[p.color],
                p.id === activePlayerId
                  ? `ring-2 ring-offset-2 ring-offset-gray-900 ${RING[p.color]} scale-110 shadow-lg`
                  : 'opacity-50 hover:opacity-80',
              ].join(' ')}
              aria-label={p.name}
              aria-pressed={p.id === activePlayerId}
            />
          ))}
          <span className="ml-1 text-xs text-gray-300">{activePlayer.name}</span>
        </div>
      </div>

      {/* ── Building type ── */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">
          Place Building
        </p>
        <div className="flex gap-2">
          <BuildingButton
            label="Settlement"
            active={placementMode === 'settlement'}
            onClick={() => toggleMode('settlement')}
            icon={<SettlementMini color={activePlayer.color} />}
          />
          <BuildingButton
            label="City"
            active={placementMode === 'city'}
            onClick={() => toggleMode('city')}
            icon={<CityMini color={activePlayer.color} />}
          />
        </div>

        {/* Status hint */}
        {placementMode && (
          <p className="mt-2 text-[11px] text-amber-400 leading-snug">
            {placementMode === 'settlement'
              ? 'Click a green vertex to place your settlement.'
              : 'Click a purple-ringed settlement to upgrade it to a city.'}
            <br />
            <span
              className="underline cursor-pointer text-gray-500 hover:text-gray-300"
              onClick={() => onModeChange(null)}
            >
              Cancel
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function BuildingButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
        active
          ? 'bg-amber-500 text-white shadow-md ring-1 ring-amber-400'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
      ].join(' ')}
      aria-pressed={active}
    >
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

// Tiny inline SVG previews for the buttons
const FILL_MAP: Record<PlayerColor, string> = { red: '#ef4444', blue: '#3b82f6', orange: '#f97316', white: '#f1f5f9' };
const STROKE_MAP: Record<PlayerColor, string> = { red: '#7f1d1d', blue: '#1e3a8a', orange: '#431407', white: '#4b5563' };

function SettlementMini({ color }: { color: PlayerColor }) {
  const f = FILL_MAP[color], s = STROKE_MAP[color];
  return (
    <svg width={18} height={20} viewBox="-10 -16 20 20" aria-hidden>
      <polygon points="0,-16 -9,-5 9,-5" fill={f} stroke={s} strokeWidth={1.5} strokeLinejoin="round" />
      <rect x={-9} y={-5} width={18} height={11} fill={f} stroke={s} strokeWidth={1.5} />
      <rect x={-3} y={1} width={6} height={5} fill="rgba(0,0,0,0.25)" rx={0.8} />
    </svg>
  );
}

function CityMini({ color }: { color: PlayerColor }) {
  const f = FILL_MAP[color], s = STROKE_MAP[color];
  return (
    <svg width={22} height={22} viewBox="-13 -24 26 26" aria-hidden>
      <rect x={-13} y={-18} width={13} height={20} fill={f} stroke={s} strokeWidth={1.5} />
      <rect x={-13} y={-22} width={3} height={4} fill={f} stroke={s} strokeWidth={1} />
      <rect x={-8} y={-22} width={3} height={4} fill={f} stroke={s} strokeWidth={1} />
      <rect x={-3} y={-22} width={3} height={4} fill={f} stroke={s} strokeWidth={1} />
      <rect x={0} y={-10} width={11} height={12} fill={f} stroke={s} strokeWidth={1.5} />
      <rect x={0} y={-14} width={3} height={4} fill={f} stroke={s} strokeWidth={1} />
      <rect x={7} y={-14} width={3} height={4} fill={f} stroke={s} strokeWidth={1} />
    </svg>
  );
}

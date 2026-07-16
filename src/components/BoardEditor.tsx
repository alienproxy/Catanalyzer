import { useMemo } from 'react';
import type { Hex, TerrainType } from '../types';
import {
  ALL_TERRAINS, ALL_TOKENS, STANDARD_TERRAIN_COUNTS, STANDARD_TOKEN_COUNTS,
  TERRAIN_LABEL, countTerrains, countTokens,
} from '../boardConstants';
import type { BoardMode } from '../boardConstants';

// Swatch colours mirror the tile fills in HexTile.
const TERRAIN_SWATCH: Record<TerrainType, string> = {
  forest: '#2d6a2d',
  pasture: '#8ecf4e',
  fields: '#f5c842',
  hills: '#cc6633',
  mountains: '#888888',
  desert: '#e8d5a0',
};

interface BoardEditorProps {
  hexes: Hex[];
  selectedHex: Hex | null;
  boardMode: BoardMode;
  onBoardModeChange: (mode: BoardMode) => void;
  onSetTerrain: (terrain: TerrainType) => void;
  onSetToken: (token: number | null) => void;
  onSetRobber: () => void;
}

export function BoardEditor({
  hexes,
  selectedHex,
  boardMode,
  onBoardModeChange,
  onSetTerrain,
  onSetToken,
  onSetRobber,
}: BoardEditorProps) {
  const realistic = boardMode === 'realistic';

  const terrainCounts = useMemo(
    () => countTerrains(hexes.map((h) => h.terrain)),
    [hexes],
  );
  const tokenCounts = useMemo(
    () => countTokens(hexes.map((h) => h.token)),
    [hexes],
  );

  // Over-supply warnings (only meaningful in Realistic mode).
  const overages = useMemo(() => {
    const items: string[] = [];
    for (const terrain of ALL_TERRAINS) {
      const have = terrainCounts[terrain] ?? 0;
      const max = STANDARD_TERRAIN_COUNTS[terrain];
      if (have > max) items.push(`${TERRAIN_LABEL[terrain]} ${have}/${max}`);
    }
    for (const token of ALL_TOKENS) {
      const have = tokenCounts[token] ?? 0;
      const max = STANDARD_TOKEN_COUNTS[token];
      if (have > max) items.push(`token ${token} ${have}/${max}`);
    }
    return items;
  }, [terrainCounts, tokenCounts]);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Realistic / Free mode toggle ── */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
          Board Mode
        </p>
        <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
          <ModeButton
            label="Realistic"
            active={realistic}
            onClick={() => onBoardModeChange('realistic')}
          />
          <ModeButton
            label="Free"
            active={!realistic}
            onClick={() => onBoardModeChange('free')}
          />
        </div>
        <p className="mt-1 text-[10px] text-gray-500 leading-snug">
          {realistic
            ? 'Warns when tiles or numbers exceed a real Catan set.'
            : 'Any terrain and number, no limits.'}
        </p>
      </div>

      {/* ── Over-supply warning (realistic only) ── */}
      {realistic && overages.length > 0 && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1.5">
          <p className="text-[10px] font-semibold text-amber-400">Over standard supply</p>
          <p className="text-[10px] text-amber-300/90 leading-snug">{overages.join(' · ')}</p>
        </div>
      )}

      {/* ── Per-tile editor ── */}
      {!selectedHex ? (
        <p className="text-[11px] text-gray-500 italic leading-snug">
          Click a tile on the board to change its terrain, number, or robber.
        </p>
      ) : (
        <TileEditor
          hex={selectedHex}
          realistic={realistic}
          terrainCounts={terrainCounts}
          tokenCounts={tokenCounts}
          onSetTerrain={onSetTerrain}
          onSetToken={onSetToken}
          onSetRobber={onSetRobber}
        />
      )}
    </div>
  );
}

// ─── Selected-tile controls ──────────────────────────────────────────────────

function TileEditor({
  hex,
  realistic,
  terrainCounts,
  tokenCounts,
  onSetTerrain,
  onSetToken,
  onSetRobber,
}: {
  hex: Hex;
  realistic: boolean;
  terrainCounts: Record<string, number>;
  tokenCounts: Record<number, number>;
  onSetTerrain: (terrain: TerrainType) => void;
  onSetToken: (token: number | null) => void;
  onSetRobber: () => void;
}) {
  const isDesert = hex.terrain === 'desert';

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-gray-400">
        Editing tile <span className="text-gray-200 font-medium">q={hex.q}, r={hex.r}</span>
      </p>

      {/* Terrain picker */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
          Terrain
        </p>
        <div className="grid grid-cols-2 gap-1">
          {ALL_TERRAINS.map((terrain) => {
            const over = realistic && (terrainCounts[terrain] ?? 0) > STANDARD_TERRAIN_COUNTS[terrain];
            return (
              <button
                key={terrain}
                onClick={() => onSetTerrain(terrain)}
                className={[
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] transition-all',
                  hex.terrain === terrain
                    ? 'bg-gray-600 text-white ring-1 ring-amber-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
                ].join(' ')}
                aria-pressed={hex.terrain === terrain}
              >
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/30"
                  style={{ backgroundColor: TERRAIN_SWATCH[terrain] }}
                />
                <span className="truncate">{TERRAIN_LABEL[terrain]}</span>
                {over && <span className="ml-auto text-amber-400 text-[10px]">!</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Token picker */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
          Number
        </p>
        {isDesert ? (
          <p className="text-[10px] text-gray-500 italic">Desert tiles have no number.</p>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {ALL_TOKENS.map((token) => {
              const over = realistic && (tokenCounts[token] ?? 0) > STANDARD_TOKEN_COUNTS[token];
              const high = token === 6 || token === 8;
              return (
                <button
                  key={token}
                  onClick={() => onSetToken(token)}
                  className={[
                    'relative py-1 rounded-md text-[11px] font-medium transition-all',
                    hex.token === token
                      ? 'bg-amber-500 text-white ring-1 ring-amber-300'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
                    high && hex.token !== token ? 'text-red-400' : '',
                    over ? 'ring-1 ring-amber-500' : '',
                  ].join(' ')}
                  aria-pressed={hex.token === token}
                  title={over ? `Over standard supply (${tokenCounts[token]}/${STANDARD_TOKEN_COUNTS[token]})` : undefined}
                >
                  {token}
                </button>
              );
            })}
            <button
              onClick={() => onSetToken(null)}
              className={[
                'py-1 rounded-md text-[11px] transition-all col-span-2',
                hex.token === null
                  ? 'bg-gray-600 text-white ring-1 ring-amber-400'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
              ].join(' ')}
              aria-pressed={hex.token === null}
            >
              None
            </button>
          </div>
        )}
      </div>

      {/* Robber */}
      <button
        onClick={onSetRobber}
        disabled={hex.hasRobber}
        className={[
          'px-2 py-1.5 rounded-md text-[11px] font-medium transition-all',
          hex.hasRobber
            ? 'bg-gray-800 text-gray-500 cursor-default'
            : 'bg-gray-700 text-gray-200 hover:bg-gray-600',
        ].join(' ')}
      >
        {hex.hasRobber ? '🏴 Robber is here' : '🏴 Move robber here'}
      </button>
    </div>
  );
}

// ─── Bits ────────────────────────────────────────────────────────────────────

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 py-1 rounded-md text-[11px] font-medium transition-all',
        active ? 'bg-amber-500 text-white shadow' : 'text-gray-400 hover:text-gray-200',
      ].join(' ')}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

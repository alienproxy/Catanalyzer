import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import GridLayout from 'react-grid-layout';
import type {
  GameState, Hex, DiceRoll, PlacementMode, PlayerColor, ResourceType, TerrainType,
} from './types';
import { TERRAIN_TO_RESOURCE } from './types';
import type { BoardMode } from './boardConstants';
import { generateBoard } from './boardGenerator';
import { HexBoard } from './components/HexBoard';
import { DiceRoller } from './components/DiceRoller';
import { InfoPanel } from './components/InfoPanel';
import { PlacementToolbar } from './components/PlacementToolbar';
import { BoardEditor } from './components/BoardEditor';
import { RDIPanel } from './components/RDIPanel';
import { ResourceDisplay } from './components/ResourceDisplay';
import { StackedAreaChart } from './components/StackedAreaChart';
import type { TurnData } from './components/StackedAreaChart';
import { MacroScoreChart } from './components/MacroScoreChart';

// ─── Constants ─────────────────────────────────────────────────────────────

const PLAYER_HEX: Record<PlayerColor, string> = {
  red: '#f87171', blue: '#60a5fa', orange: '#fb923c', white: '#e2e8f0',
};

// ─── Modular dashboard grid ─────────────────────────────────────────────────

const GridBoard = GridLayout.WidthProvider(GridLayout);

/** Default panel arrangement (12-col grid, rowHeight ≈ 30px). Vertical compaction tidies gaps. */
const DEFAULT_LAYOUT: GridLayout.Layout[] = [
  { i: 'board',      x: 0, y: 0,  w: 5, h: 16 },
  { i: 'history',    x: 5, y: 0,  w: 4, h: 10 },
  { i: 'power',      x: 9, y: 0,  w: 3, h: 10 },
  { i: 'rdi',        x: 9, y: 10, w: 3, h: 8 },
  { i: 'resources',  x: 5, y: 10, w: 4, h: 6 },
  { i: 'place',      x: 0, y: 16, w: 3, h: 6 },
  { i: 'dice',       x: 3, y: 16, w: 2, h: 6 },
  { i: 'inspector',  x: 5, y: 16, w: 4, h: 4 },
  { i: 'layout',     x: 9, y: 18, w: 3, h: 5 },
  { i: 'editor',     x: 0, y: 22, w: 3, h: 14 },
];

// ─── Initial state ─────────────────────────────────────────────────────────

function buildInitialState(): GameState {
  const { hexes, vertices, edges, ports, robberHexId } = generateBoard(true);
  return {
    hexes,
    vertices,
    edges,
    ports,
    players: [
      { id: 'p1', name: 'Player 1', color: 'red',    resources: { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 }, victoryPoints: 0 },
      { id: 'p2', name: 'Player 2', color: 'blue',   resources: { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 }, victoryPoints: 0 },
      { id: 'p3', name: 'Player 3', color: 'orange', resources: { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 }, victoryPoints: 0 },
      { id: 'p4', name: 'Player 4', color: 'white',  resources: { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 }, victoryPoints: 0 },
    ],
    currentPlayerId: 'p1',
    phase: 'setup',
    diceRolls: [],
    lastRoll: null,
    robberHexId,
    selectedId: null,
  };
}

// ─── Placement validation helpers ──────────────────────────────────────────

/** Check Catan distance rule: vertex must be empty AND no adjacent vertex has a building. */
function canPlaceSettlement(
  vertexId: string,
  state: GameState,
): boolean {
  const v = state.vertices.get(vertexId);
  if (!v || v.building !== null) return false;

  const neighborIds = v.adjacentEdgeIds.flatMap((eid) => {
    const edge = state.edges.get(eid)!;
    return edge.vertexIds.filter((id) => id !== vertexId);
  });

  return neighborIds.every((nid) => state.vertices.get(nid)?.building === null);
}

/** City can only upgrade an existing settlement owned by the given player. */
function canPlaceCity(
  vertexId: string,
  playerColor: PlayerColor,
  state: GameState,
): boolean {
  const v = state.vertices.get(vertexId);
  return v?.building === 'settlement' && v.owner === playerColor;
}

// ─── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [gameState, setGameState] = useState<GameState>(buildInitialState);
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
  const [editMode, setEditMode] = useState(false);
  const [boardMode, setBoardMode] = useState<BoardMode>('realistic');
  const [layout, setLayout] = useState<GridLayout.Layout[]>(DEFAULT_LAYOUT);
  const [activePlayerId, setActivePlayerId] = useState('p1');
  const [aboutOpen, setAboutOpen] = useState(false);

  // Merge RGL's reported positions over stored ones so panels that are temporarily
  // absent (e.g. the editor when Edit mode is off) keep their remembered slot.
  const handleLayoutChange = useCallback((current: GridLayout.Layout[]) => {
    setLayout((prev) => {
      const map = new Map(prev.map((l) => [l.i, l]));
      for (const l of current) map.set(l.i, l);
      return [...map.values()];
    });
  }, []);
  const [lastGain, setLastGain] = useState<
    Partial<Record<PlayerColor, Partial<Record<ResourceType, number>>>>
  >({});
  const [turnHistory, setTurnHistory] = useState<Map<string, TurnData[]>>(new Map());

  const activePlayer = useMemo(
    () => gameState.players.find((p) => p.id === activePlayerId)!,
    [gameState.players, activePlayerId],
  );

  // ── Compute which vertices are valid for the current placement mode ──────

  const validPlacementIds = useMemo<Set<string>>(() => {
    if (!placementMode) return new Set();

    const valid = new Set<string>();
    for (const [vid] of gameState.vertices) {
      if (placementMode === 'settlement' && canPlaceSettlement(vid, gameState)) {
        valid.add(vid);
      } else if (placementMode === 'city' && canPlaceCity(vid, activePlayer.color, gameState)) {
        valid.add(vid);
      }
    }
    return valid;
  }, [placementMode, activePlayer.color, gameState]);

  // ── Snapshot resource history after each dice roll ───────────────────────

  useEffect(() => {
    const turn = gameState.diceRolls.length;
    if (turn === 0) return;
    setTurnHistory((prev) => {
      const next = new Map(prev);
      for (const player of gameState.players) {
        const r = player.resources;
        const snap: TurnData = {
          turn,
          wood:  r.lumber,
          brick: r.brick,
          wheat: r.grain,
          sheep: r.wool,
          ore:   r.ore,
        };
        const existing = next.get(player.id) ?? [];
        next.set(player.id, [...existing.filter((d) => d.turn !== turn), snap]);
      }
      return next;
    });
  }, [gameState.diceRolls, gameState.players]);

  // ── Roll Dice + collect resources ────────────────────────────────────────

  const rollDice = useCallback(() => {
    const die1 = Math.ceil(Math.random() * 6);
    const die2 = Math.ceil(Math.random() * 6);
    const roll: DiceRoll = { die1, die2, sum: die1 + die2, timestamp: Date.now() };
    console.log(`Dice → ${die1} + ${die2} = ${roll.sum}`);

    setGameState((s) => {
      const matchingHexes = s.hexes.filter(
        (h) => h.token === roll.sum && !h.hasRobber,
      );

      // Tally resources owed to each player color
      const gain: Record<string, Record<ResourceType, number>> = {};

      for (const hex of matchingHexes) {
        if (hex.terrain === 'desert') continue;
        const resource = TERRAIN_TO_RESOURCE[hex.terrain as keyof typeof TERRAIN_TO_RESOURCE];

        for (const vertex of s.vertices.values()) {
          if (!vertex.adjacentHexIds.includes(hex.id)) continue;
          if (!vertex.building || !vertex.owner) continue;

          const amount = vertex.building === 'city' ? 2 : 1;
          if (!gain[vertex.owner]) {
            gain[vertex.owner] = { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 };
          }
          gain[vertex.owner][resource] += amount;
        }
      }

      // Log gains
      for (const [color, g] of Object.entries(gain)) {
        const parts = (Object.entries(g) as [ResourceType, number][])
          .filter(([, n]) => n > 0)
          .map(([r, n]) => `${n} ${r}`);
        if (parts.length) console.log(`  ${color}: +${parts.join(', ')}`);
      }

      const updatedPlayers = s.players.map((p) => {
        const g = gain[p.color] ?? {};
        return {
          ...p,
          resources: {
            lumber: p.resources.lumber + (g.lumber ?? 0),
            wool:   p.resources.wool   + (g.wool   ?? 0),
            grain:  p.resources.grain  + (g.grain  ?? 0),
            brick:  p.resources.brick  + (g.brick  ?? 0),
            ore:    p.resources.ore    + (g.ore    ?? 0),
          },
        };
      });

      // Save gain for the badge flash (outside the setter, below)
      setLastGain(gain as typeof lastGain);

      return { ...s, lastRoll: roll, diceRolls: [...s.diceRolls, roll], players: updatedPlayers };
    });
  }, []);

  // ── Click handlers ───────────────────────────────────────────────────────

  const handleHexClick = useCallback((hex: Hex) => {
    setGameState((s) => ({ ...s, selectedId: hex.id }));
  }, []);

  const handleVertexClick = useCallback((id: string) => {
    setGameState((s) => {
      const vertex = s.vertices.get(id);
      if (!vertex) return s;

      // Not in placement mode — just select
      if (!placementMode) return { ...s, selectedId: id };

      const player = s.players.find((p) => p.id === activePlayerId)!;

      // Re-validate inside setter (avoids stale-closure issues)
      let valid = false;
      if (placementMode === 'settlement') {
        valid = canPlaceSettlement(id, s);
      } else if (placementMode === 'city') {
        valid = canPlaceCity(id, player.color, s);
      }

      if (!valid) {
        console.log(`Cannot place ${placementMode} at vertex ${id}`);
        return { ...s, selectedId: id };
      }

      const newVertices = new Map(s.vertices);
      newVertices.set(id, { ...vertex, building: placementMode, owner: player.color });

      const action = placementMode === 'city' ? 'City upgraded' : 'Settlement placed';
      console.log(`${action} by ${player.name} (${player.color}) at vertex ${id}`);

      return { ...s, vertices: newVertices, selectedId: id };
    });
  }, [placementMode, activePlayerId]);

  const handleEdgeClick = useCallback((id: string) => {
    setGameState((s) => ({ ...s, selectedId: id }));
  }, []);

  const handleDeleteBuilding = useCallback((vertexId: string) => {
    setGameState((s) => {
      const vertex = s.vertices.get(vertexId);
      if (!vertex?.building) return s;
      const newVertices = new Map(s.vertices);
      newVertices.set(vertexId, { ...vertex, building: null, owner: null });
      console.log(`Building removed at vertex ${vertexId}`);
      return { ...s, vertices: newVertices, selectedId: null };
    });
  }, []);

  // ── Board editor handlers (operate on the selected hex) ──────────────────

  const toggleEditMode = useCallback(() => {
    setEditMode((e) => !e);
    setPlacementMode(null); // editing and building placement shouldn't be armed together
  }, []);

  const handleSetTerrain = useCallback((hexId: string, terrain: TerrainType) => {
    setGameState((s) => ({
      ...s,
      hexes: s.hexes.map((h) => {
        if (h.id !== hexId) return h;
        // Desert carries no number; everything else keeps whatever token it has.
        return { ...h, terrain, token: terrain === 'desert' ? null : h.token };
      }),
    }));
  }, []);

  const handleSetToken = useCallback((hexId: string, token: number | null) => {
    setGameState((s) => ({
      ...s,
      hexes: s.hexes.map((h) => (h.id === hexId ? { ...h, token } : h)),
    }));
  }, []);

  const handleSetRobber = useCallback((hexId: string) => {
    setGameState((s) => ({
      ...s,
      robberHexId: hexId,
      hexes: s.hexes.map((h) => ({ ...h, hasRobber: h.id === hexId })),
    }));
  }, []);

  const selectedHex = useMemo(
    () => gameState.hexes.find((h) => h.id === gameState.selectedId) ?? null,
    [gameState.hexes, gameState.selectedId],
  );

  const handleNewGame = useCallback(() => {
    setGameState(buildInitialState());
    setPlacementMode(null);
    setLastGain({});
    setTurnHistory(new Map());
  }, []);

  const handleResetStats = useCallback(() => {
    setGameState((s) => ({
      ...s,
      players: s.players.map((p) => ({
        ...p,
        resources: { lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 },
      })),
      diceRolls: [],
      lastRoll: null,
    }));
    setLastGain({});
    setTurnHistory(new Map());
  }, []);

  // ── Terrain display labels ────────────────────────────────────────────────

  const TERRAIN_LABEL: Record<string, string> = {
    forest: 'Lumber', pasture: 'Sheep', fields: 'Wheat',
    hills: 'Brick', mountains: 'Ore', desert: 'Desert',
  };

  // ── Derived data for sidebar ─────────────────────────────────────────────

  const terrainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of gameState.hexes) counts[h.terrain] = (counts[h.terrain] ?? 0) + 1;
    return counts;
  }, [gameState.hexes]);

  const vertexList = useMemo(() => [...gameState.vertices.values()], [gameState.vertices]);

  // Effective trade ratios per player based on port access [wood, brick, wheat, sheep, ore]
  const playerRatios = useMemo(() => {
    const result = new Map<string, number[]>();
    for (const player of gameState.players) {
      const ownedIds = new Set(
        vertexList.filter((v) => v.owner === player.color && v.building !== null).map((v) => v.id),
      );
      const ratios: Record<ResourceType, number> = { lumber: 4, wool: 4, grain: 4, brick: 4, ore: 4 };
      for (const port of gameState.ports) {
        if (!port.vertexIds.some((vid) => ownedIds.has(vid))) continue;
        if (port.type === 'generic') {
          (Object.keys(ratios) as ResourceType[]).forEach((r) => { if (ratios[r] > 3) ratios[r] = 3; });
        } else {
          ratios[port.type as ResourceType] = 2;
        }
      }
      // Order: [wood/lumber, brick, wheat/grain, sheep/wool, ore]
      result.set(player.id, [ratios.lumber, ratios.brick, ratios.grain, ratios.wool, ratios.ore]);
    }
    return result;
  }, [gameState.players, gameState.ports, vertexList]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-none px-6 py-3 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="sr-only">Catanalyzer</h1>
          <img
            src={`${import.meta.env.BASE_URL}CatanalyzerLogoCat.png`}
            alt="Catanalyzer"
            className="h-[72px] w-auto"
          />        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleEditMode}
            aria-pressed={editMode}
            className={[
              'px-4 py-2 text-sm rounded-lg transition-colors font-medium',
              editMode
                ? 'bg-amber-500 text-white ring-1 ring-amber-300'
                : 'bg-gray-700 hover:bg-gray-600',
            ].join(' ')}
          >
            {editMode ? 'Editing Board' : 'Edit Board'}
          </button>
          <button
            onClick={handleResetStats}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Reset Stats
          </button>
          <button
            onClick={handleNewGame}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors font-medium"
          >
            New Game
          </button>
          <a
            href={`${import.meta.env.BASE_URL}Catanalyzer.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Manual
          </a>
          <button
            onClick={() => setAboutOpen(true)}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            About
          </button>
        </div>
      </header>

      {/* ── Modular dashboard — every panel is draggable (by header) & resizable ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        <GridBoard
          className="catan-dashboard"
          layout={layout}
          cols={12}
          rowHeight={30}
          margin={[8, 8]}
          containerPadding={[10, 10]}
          draggableHandle=".panel-drag-handle"
          compactType="vertical"
          onLayoutChange={handleLayoutChange}
        >
          {/* Board */}
          <div key="board" className={PANEL_CLASS}>
            <Panel title="Board">
              <div className="h-full flex items-center justify-center overflow-hidden">
                <HexBoard
                  state={gameState}
                  placementMode={placementMode}
                  validPlacementIds={validPlacementIds}
                  activePlayerColor={activePlayer.color}
                  onHexClick={handleHexClick}
                  onVertexClick={handleVertexClick}
                  onEdgeClick={handleEdgeClick}
                  onDeleteBuilding={handleDeleteBuilding}
                />
              </div>
            </Panel>
          </div>

          {/* Resource History */}
          <div key="history" className={PANEL_CLASS}>
            <Panel title="Resource History" hint="cumulative · per player">
              <div className="grid grid-cols-2 auto-rows-min gap-2">
                {gameState.players.map((player) => (
                  <StackedAreaChart
                    key={player.id}
                    playerData={turnHistory.get(player.id) ?? []}
                    playerName={player.name}
                    playerColor={PLAYER_HEX[player.color]}
                  />
                ))}
              </div>
            </Panel>
          </div>

          {/* Purchasing Power */}
          <div key="power" className={PANEL_CLASS}>
            <Panel title="Purchasing Power" hint="count vs. VP · bank-adjusted" bodyClass="flex-1 min-h-0 p-3">
              <MacroScoreChart players={gameState.players} turnHistory={turnHistory} playerRatios={playerRatios} />
            </Panel>
          </div>

          {/* Diversification (RDI) */}
          <div key="rdi" className={PANEL_CLASS}>
            <Panel title="Diversification (RDI)" hint="structural balance">
              <RDIPanel state={gameState} players={gameState.players} />
            </Panel>
          </div>

          {/* Resources */}
          <div key="resources" className={PANEL_CLASS}>
            <Panel title="Resources">
              <ResourceDisplay
                players={gameState.players}
                vertices={vertexList}
                hexes={gameState.hexes}
                ports={gameState.ports}
                lastGain={lastGain}
              />
            </Panel>
          </div>

          {/* Place Buildings */}
          <div key="place" className={PANEL_CLASS}>
            <Panel title="Place Buildings">
              <PlacementToolbar
                players={gameState.players}
                activePlayerId={activePlayerId}
                placementMode={placementMode}
                onPlayerChange={setActivePlayerId}
                onModeChange={setPlacementMode}
              />
            </Panel>
          </div>

          {/* Dice */}
          <div key="dice" className={PANEL_CLASS}>
            <Panel title="Dice">
              <DiceRoller
                lastRoll={gameState.lastRoll}
                rollHistory={gameState.diceRolls}
                onRoll={rollDice}
              />
            </Panel>
          </div>

          {/* Inspector */}
          <div key="inspector" className={PANEL_CLASS}>
            <Panel title="Inspector">
              <InfoPanel state={gameState} />
            </Panel>
          </div>

          {/* Board Layout + legend */}
          <div key="layout" className={PANEL_CLASS}>
            <Panel title="Board Layout">
              <ul className="space-y-1 text-xs text-gray-300">
                {Object.entries(terrainCounts).map(([terrain, count]) => (
                  <li key={terrain} className="flex justify-between">
                    <span>{TERRAIN_LABEL[terrain] ?? terrain}</span>
                    <span className="text-gray-500">{count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-600">
                {gameState.vertices.size} v · {gameState.edges.size} e
              </p>
              <div className="mt-3 pt-2 border-t border-gray-700/60 text-[11px] text-gray-500 leading-relaxed">
                <p><span className="text-amber-500 font-medium">Settlement</span> → 1 resource/hex</p>
                <p><span className="text-amber-500 font-medium">City</span> → 2 resources/hex</p>
                <p className="mt-1">6 &amp; 8 tiles have the highest roll odds.</p>
              </div>
            </Panel>
          </div>

          {/* Board Editor — only present while Edit mode is on */}
          {editMode && (
            <div key="editor" className={PANEL_CLASS}>
              <Panel title="Board Editor" hint={boardMode}>
                <BoardEditor
                  hexes={gameState.hexes}
                  selectedHex={selectedHex}
                  boardMode={boardMode}
                  onBoardModeChange={setBoardMode}
                  onSetTerrain={(terrain) => selectedHex && handleSetTerrain(selectedHex.id, terrain)}
                  onSetToken={(token) => selectedHex && handleSetToken(selectedHex.id, token)}
                  onSetRobber={() => selectedHex && handleSetRobber(selectedHex.id)}
                />
              </Panel>
            </div>
          )}
        </GridBoard>
      </div>

      {/* ── About dialog ── */}
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </div>
  );
}

// ─── About dialog ────────────────────────────────────────────────────────────

function AboutDialog({ onClose }: { onClose: () => void }) {
  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
        >
          ✕
        </button>
        <h2 id="about-title" className="mb-3 text-lg font-bold text-amber-400">
          About Catanalyzer
        </h2>
        <p className="text-sm leading-relaxed text-gray-300">
          Catanalyzer was conceived and vibe coded by Jose Jaime Olivo (Jimi). Jimi is a
          writer and musician with a background in Software QA Analysis, Software Test
          Engineering, and Technical Writing.
        </p>
        <p className="mt-3 text-sm text-gray-300">
          Email:{' '}
          <a href="mailto:jimmy.olivo@gmail.com" className="text-amber-400 hover:underline">
            jimmy.olivo@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard panel chrome ──────────────────────────────────────────────────

/** Shared shell for every draggable grid tile. RGL sets its size/position + resize handle. */
const PANEL_CLASS =
  'bg-gray-900 rounded-lg border border-gray-700 overflow-hidden flex flex-col shadow-lg';

function Panel({
  title,
  hint,
  children,
  bodyClass = 'flex-1 min-h-0 overflow-auto p-3',
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  bodyClass?: string;
}) {
  return (
    <>
      {/* Drag handle — the only region that initiates a drag */}
      <div className="panel-drag-handle flex-none flex items-baseline gap-2 px-3 py-1.5 border-b border-gray-700/60 bg-gray-800/40 cursor-move select-none">
        <h2 className="text-xs font-semibold text-amber-400">{title}</h2>
        {hint && <span className="text-[10px] text-gray-500">{hint}</span>}
      </div>
      <div className={bodyClass}>{children}</div>
    </>
  );
}

import type { Player, PlayerColor, Vertex, Hex, ResourceType, Port, PortType } from '../types';

const PLAYER_BG: Record<PlayerColor, string> = {
  red:    'bg-red-500',
  blue:   'bg-blue-500',
  orange: 'bg-orange-400',
  white:  'bg-gray-200',
};

const RESOURCE_META: { type: ResourceType; label: string; abbr: string; color: string }[] = [
  { type: 'lumber', label: 'Lumber', abbr: 'LUM', color: 'text-green-400' },
  { type: 'wool',   label: 'Wool',   abbr: 'WOL', color: 'text-sky-300' },
  { type: 'grain',  label: 'Grain',  abbr: 'GRN', color: 'text-yellow-300' },
  { type: 'brick',  label: 'Brick',  abbr: 'BRK', color: 'text-orange-400' },
  { type: 'ore',    label: 'Ore',    abbr: 'ORE', color: 'text-slate-300' },
];

const PORT_COLOR: Record<PortType, string> = {
  lumber: 'text-green-400', wool: 'text-sky-300', grain: 'text-yellow-300',
  brick: 'text-orange-400', ore: 'text-slate-300', generic: 'text-gray-200',
};

interface ResourceDisplayProps {
  players: Player[];
  vertices: Vertex[];
  hexes: Hex[];
  ports: Port[];
  /** Resources awarded in the most recent dice roll, keyed by player color. */
  lastGain: Partial<Record<PlayerColor, Partial<Record<ResourceType, number>>>>;
}

function tokenPips(token: number): number {
  return Math.min(token - 1, 13 - token);
}

export function ResourceDisplay({ players, vertices, hexes, ports, lastGain }: ResourceDisplayProps) {
  const hexById = new Map(hexes.map((h) => [h.id, h]));

  return (
    <div className="space-y-2.5">
      {players.map((p) => {
        const ownedVertices = vertices.filter((v) => v.owner === p.color && v.building !== null);
        const settlements = ownedVertices.filter((v) => v.building === 'settlement').length;
        const cities      = ownedVertices.filter((v) => v.building === 'city').length;
        const vp          = settlements + cities * 2;

        const pipCount = ownedVertices.reduce((sum, v) => {
          for (const hexId of v.adjacentHexIds) {
            const hex = hexById.get(hexId);
            if (hex?.token != null) sum += tokenPips(hex.token);
          }
          return sum;
        }, 0);
        const gain        = lastGain[p.color] ?? {};

        // Compute the best trade ratio per resource for this player
        const ownedIds = new Set(ownedVertices.map((v) => v.id));
        const playerPorts = ports.filter((port) => port.vertexIds.some((vid) => ownedIds.has(vid)));
        const ratios: Record<ResourceType, 2 | 3 | 4> = { lumber: 4, wool: 4, grain: 4, brick: 4, ore: 4 };
        for (const port of playerPorts) {
          if (port.type === 'generic') {
            (Object.keys(ratios) as ResourceType[]).forEach((r) => { if (ratios[r] > 3) ratios[r] = 3; });
          } else {
            ratios[port.type as ResourceType] = 2;
          }
        }

        return (
          <div key={p.id} className="bg-gray-800 rounded-lg p-3">
            {/* Header row */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${PLAYER_BG[p.color]}`} />
              <span className="text-xs font-semibold text-gray-200 flex-1">{p.name}</span>
              <span className="text-[10px] text-gray-500">{settlements}🏠 {cities}🏰</span>
              {pipCount > 0 && (
                <span className="text-[10px] font-semibold text-purple-400" title="PIP count — sum of dice-probability dots on all owned production tiles">
                  {pipCount} pip{pipCount !== 1 ? 's' : ''}
                </span>
              )}
              <span className="text-xs font-bold text-amber-400 ml-1">{vp} VP</span>
            </div>

            {/* Resource row */}
            <div className="grid grid-cols-5 gap-1">
              {RESOURCE_META.map(({ type, label, abbr, color }) => {
                const gained = gain[type] ?? 0;
                return (
                  <div key={type} className="text-center" title={label}>
                    <div className="relative inline-block">
                      <span className={`text-sm font-bold leading-none ${color}`}>
                        {p.resources[type]}
                      </span>
                      {/* Flash badge when resources were just gained */}
                      {gained > 0 && (
                        <span className="absolute -top-2.5 -right-2.5 text-[9px] font-bold bg-green-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                          +{gained}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5 leading-none">{abbr}</div>
                  </div>
                );
              })}
            </div>

            {/* Total card count */}
            <div className="mt-1.5 text-right text-[10px] text-gray-600">
              {Object.values(p.resources).reduce((a, b) => a + b, 0)} cards
            </div>

            {/* Port trade rates — only shown if player has any port */}
            {playerPorts.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700/60 flex flex-wrap gap-x-2 gap-y-0.5">
                {RESOURCE_META.map(({ type, abbr }) => {
                  const r = ratios[type];
                  return (
                    <span
                      key={type}
                      className={`text-[9px] font-semibold ${r < 4 ? PORT_COLOR[type as PortType] : 'text-gray-700'}`}
                    >
                      {abbr} {r}:1
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

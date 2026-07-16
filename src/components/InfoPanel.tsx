import type { ReactNode } from 'react';
import type { GameState } from '../types';

interface InfoPanelProps {
  state: GameState;
}

export function InfoPanel({ state }: InfoPanelProps) {
  const { selectedId, hexes, vertices, edges, lastRoll } = state;

  let content: ReactNode = (
    <p className="text-gray-400 text-xs italic">Click any hex, vertex, or edge to inspect it.</p>
  );

  if (selectedId) {
    const hex = hexes.find((h) => h.id === selectedId);
    const vertex = vertices.get(selectedId);
    const edge = edges.get(selectedId);

    if (hex) {
      content = (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <Label>Type</Label><Value>Hex</Value>
          <Label>ID</Label><Value>{hex.id}</Value>
          <Label>Coords</Label><Value>q={hex.q}, r={hex.r}</Value>
          <Label>Terrain</Label><Value className="capitalize">{hex.terrain}</Value>
          <Label>Token</Label><Value>{hex.token ?? '—'}</Value>
          <Label>Robber</Label><Value>{hex.hasRobber ? 'Yes' : 'No'}</Value>
        </dl>
      );
    } else if (vertex) {
      content = (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <Label>Type</Label><Value>Vertex</Value>
          <Label>ID</Label><Value className="break-all text-[10px]">{vertex.id}</Value>
          <Label>Position</Label><Value>({vertex.x.toFixed(1)}, {vertex.y.toFixed(1)})</Value>
          <Label>Building</Label><Value>{vertex.building ?? 'none'}</Value>
          <Label>Owner</Label><Value>{vertex.owner ?? '—'}</Value>
          <Label>Adj Hexes</Label><Value>{vertex.adjacentHexIds.length}</Value>
          <Label>Adj Edges</Label><Value>{vertex.adjacentEdgeIds.length}</Value>
        </dl>
      );
    } else if (edge) {
      content = (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <Label>Type</Label><Value>Edge</Value>
          <Label>ID</Label><Value className="break-all text-[10px]">{edge.id}</Value>
          <Label>Road</Label><Value>{edge.road ? 'Yes' : 'No'}</Value>
          <Label>Owner</Label><Value>{edge.owner ?? '—'}</Value>
          <Label>Adj Hexes</Label><Value>{edge.adjacentHexIds.length}</Value>
        </dl>
      );
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white min-h-[120px]">
      <h3 className="text-sm font-semibold text-amber-400 mb-2">Inspector</h3>
      {content}
      {lastRoll && (
        <p className="mt-3 text-xs text-gray-400 border-t border-gray-700 pt-2">
          Last roll: <span className="font-bold text-amber-300">{lastRoll.sum}</span>{' '}
          ({lastRoll.die1} + {lastRoll.die2})
        </p>
      )}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <dt className="text-gray-400 font-medium">{children}</dt>;
}

function Value({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <dd className={`text-gray-100 ${className}`}>{children}</dd>;
}

import { useState } from 'react';
import type { Edge } from '../types';

const ROAD_COLOR: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  white: '#e5e7eb',
};

interface EdgeOverlayProps {
  edges: Edge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function EdgeOverlay({ edges, selectedId, onSelect }: EdgeOverlayProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {edges.map((e) => {
        const isHovered = hoveredId === e.id;
        const isSelected = selectedId === e.id;
        const hasRoad = e.road;

        return (
          <g key={e.id}>
            {/* Invisible thick hit area */}
            <line
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke="transparent"
              strokeWidth={14}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredId(e.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                console.log(
                  `Edge clicked → id: ${e.id}  vertices: [${e.vertexIds.join(', ')}]  adjacent hexes: [${e.adjacentHexIds.join(', ')}]  road: ${e.road}`
                );
                onSelect(e.id);
              }}
            />

            {/* Visual road or hover highlight */}
            {(isHovered || isSelected || hasRoad) && (
              <line
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={
                  hasRoad
                    ? ROAD_COLOR[e.owner ?? 'white']
                    : isSelected
                    ? '#facc15'
                    : 'rgba(255,220,80,0.7)'
                }
                strokeWidth={hasRoad ? 5 : 4}
                strokeLinecap="round"
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
    </>
  );
}

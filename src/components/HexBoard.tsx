import { useMemo } from 'react';
import type { GameState, Hex, Vertex, Edge, PlacementMode, PlayerColor } from '../types';
import { HexTile } from './HexTile';
import { VertexOverlay } from './VertexOverlay';
import { EdgeOverlay } from './EdgeOverlay';
import { PortOverlay } from './PortOverlay';
import { HEX_SIZE } from '../utils/hexMath';

const OCEAN_FILL = '#1a6bab';

interface HexBoardProps {
  state: GameState;
  placementMode: PlacementMode;
  validPlacementIds: Set<string>;
  activePlayerColor: PlayerColor;
  onHexClick: (hex: Hex) => void;
  onVertexClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onDeleteBuilding: (id: string) => void;
}

export function HexBoard({
  state,
  placementMode,
  validPlacementIds,
  activePlayerColor,
  onHexClick,
  onVertexClick,
  onEdgeClick,
  onDeleteBuilding,
}: HexBoardProps) {
  const { hexes, vertices, edges, lastRoll, selectedId } = state;

  const highlightedTokens = useMemo(
    () => (lastRoll ? new Set([lastRoll.sum]) : new Set<number>()),
    [lastRoll]
  );

  const viewBox = useMemo(() => {
    const padding = HEX_SIZE * 1.8;
    const allX = hexes.flatMap((h) => {
      const cx = HEX_SIZE * Math.sqrt(3) * (h.q + h.r / 2);
      return [cx - HEX_SIZE, cx + HEX_SIZE];
    });
    const allY = hexes.flatMap((h) => {
      const cy = HEX_SIZE * 1.5 * h.r;
      return [cy - HEX_SIZE, cy + HEX_SIZE];
    });
    const minX = Math.min(...allX) - padding;
    const minY = Math.min(...allY) - padding;
    const maxX = Math.max(...allX) + padding;
    const maxY = Math.max(...allY) + padding;
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }, [hexes]);

  const vertexList: Vertex[] = useMemo(() => [...vertices.values()], [vertices]);
  const edgeList: Edge[] = useMemo(() => [...edges.values()], [edges]);

  return (
    <svg
      viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
      style={{ width: '100%', height: '100%', maxHeight: '80vh' }}
      aria-label="Catan Board"
    >
      <rect
        x={viewBox.minX}
        y={viewBox.minY}
        width={viewBox.width}
        height={viewBox.height}
        fill={OCEAN_FILL}
      />

      {hexes.map((hex) => (
        <HexTile
          key={hex.id}
          hex={hex}
          isHighlighted={hex.token !== null && highlightedTokens.has(hex.token)}
          isSelected={selectedId === hex.id}
          onClick={onHexClick}
        />
      ))}

      <PortOverlay ports={state.ports} />

      <EdgeOverlay edges={edgeList} selectedId={selectedId} onSelect={onEdgeClick} />

      <VertexOverlay
        vertices={vertexList}
        selectedId={selectedId}
        placementMode={placementMode}
        validPlacementIds={validPlacementIds}
        activePlayerColor={activePlayerColor}
        onSelect={onVertexClick}
        onDelete={onDeleteBuilding}
      />
    </svg>
  );
}

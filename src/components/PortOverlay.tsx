import type { Port, PortType } from '../types';

// ─── Visual config ─────────────────────────────────────────────────────────

const PORT_COLOR: Record<PortType, string> = {
  lumber:  '#22c55e',
  wool:    '#0ea5e9',
  grain:   '#eab308',
  brick:   '#ef4444',
  ore:     '#94a3b8',
  generic: '#e2e8f0',
};

const PORT_LABEL: Record<PortType, string> = {
  lumber:  '2:1\nLBR',
  wool:    '2:1\nWOL',
  grain:   '2:1\nGRN',
  brick:   '2:1\nBRK',
  ore:     '2:1\nORE',
  generic: '3:1\nANY',
};

// ─── Single port marker ────────────────────────────────────────────────────

function PortMarker({ port }: { port: Port }) {
  const color = PORT_COLOR[port.type];
  const [line1, line2] = PORT_LABEL[port.type].split('\n');

  return (
    <g>
      {/* Pier lines from each vertex to the dock */}
      <line
        x1={port.v1x} y1={port.v1y} x2={port.dockX} y2={port.dockY}
        stroke={color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7}
      />
      <line
        x1={port.v2x} y1={port.v2y} x2={port.dockX} y2={port.dockY}
        stroke={color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7}
      />

      {/* Port access rings on the two coastal vertices */}
      <circle
        cx={port.v1x} cy={port.v1y} r={7}
        fill="none" stroke={color} strokeWidth={1.8} strokeDasharray="3 2"
        opacity={0.85}
      />
      <circle
        cx={port.v2x} cy={port.v2y} r={7}
        fill="none" stroke={color} strokeWidth={1.8} strokeDasharray="3 2"
        opacity={0.85}
      />

      {/* Dock badge */}
      <rect
        x={port.dockX - 16} y={port.dockY - 11}
        width={32} height={22}
        rx={4}
        fill="#0f172a" stroke={color} strokeWidth={1.5}
        opacity={0.92}
      />
      {/* Ratio line */}
      <text
        x={port.dockX} y={port.dockY - 2}
        textAnchor="middle" fontSize={7.5} fontWeight="bold"
        fontFamily="monospace" fill={color}
      >
        {line1}
      </text>
      {/* Resource line */}
      <text
        x={port.dockX} y={port.dockY + 7.5}
        textAnchor="middle" fontSize={7} fontWeight="bold"
        fontFamily="monospace" fill={color} opacity={0.85}
      >
        {line2}
      </text>
    </g>
  );
}

// ─── Overlay ───────────────────────────────────────────────────────────────

interface PortOverlayProps {
  ports: Port[];
}

export function PortOverlay({ ports }: PortOverlayProps) {
  return (
    <>
      {ports.map((port) => (
        <PortMarker key={port.id} port={port} />
      ))}
    </>
  );
}

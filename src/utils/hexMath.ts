/**
 * Hex math using Red Blob Games' axial coordinate system.
 * All hexagons are POINTY-TOP orientation.
 *
 * Axial → Cube: x = q,  z = r,  y = -q - r
 * Pixel formula (pointy-top, size = circumradius):
 *   px = size * √3 * (q + r/2)
 *   py = size * 3/2 * r
 */

export const HEX_SIZE = 60; // circumradius in SVG pixels

/** Convert axial (q, r) to SVG pixel center. */
export function axialToPixel(q: number, r: number, size = HEX_SIZE): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r,
  };
}

/** Return the six corner positions of a pointy-top hex centered at (cx, cy). */
export function hexCorners(cx: number, cy: number, size = HEX_SIZE): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angleDeg = 60 * i - 90; // -90° = top vertex
    const rad = (Math.PI / 180) * angleDeg;
    return {
      x: cx + size * Math.cos(rad),
      y: cy + size * Math.sin(rad),
    };
  });
}

/** Stable vertex key – rounds to 1 decimal place to absorb float noise. */
export function vertexKey(x: number, y: number): string {
  return `v${Math.round(x * 10)}_${Math.round(y * 10)}`;
}

/** Stable edge key – sort the two vertex keys so order doesn't matter. */
export function edgeKey(vA: string, vB: string): string {
  return [vA, vB].sort().join('--');
}

/** All 19 axial coordinates for the standard Catan island (radius-2 hex grid). */
export function standardBoardCoords(): { q: number; r: number }[] {
  const coords: { q: number; r: number }[] = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q) <= 2 && Math.abs(r) <= 2 && Math.abs(q + r) <= 2) {
        coords.push({ q, r });
      }
    }
  }
  return coords; // 19 tiles
}

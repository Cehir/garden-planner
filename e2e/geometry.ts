// Rechteck-Vergleiche für Geometrie-Assertions (Bounding-Boxen in Bildschirm-Pixeln)
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

// Halbes Pixel Spielraum für Subpixel-Rundung
const TOLERANCE = 0.5

/** Liegt `inner` vollständig in `outer`? */
export function isInside(inner: Box, outer: Box): boolean {
  return (
    inner.x >= outer.x - TOLERANCE &&
    inner.y >= outer.y - TOLERANCE &&
    inner.x + inner.width <= outer.x + outer.width + TOLERANCE &&
    inner.y + inner.height <= outer.y + outer.height + TOLERANCE
  )
}

/** Überlappen sich die beiden Rechtecke (mehr als die Toleranz)? */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x + a.width > b.x + TOLERANCE &&
    b.x + b.width > a.x + TOLERANCE &&
    a.y + a.height > b.y + TOLERANCE &&
    b.y + b.height > a.y + TOLERANCE
  )
}

export const fmt = (b: Box) => `(${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.width.toFixed(1)}×${b.height.toFixed(1)})`

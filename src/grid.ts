export interface GridLine {
  x1: number
  y1: number
  x2: number
  y2: number
  major: boolean
}

/** Grid lines for a garden of `width`×`height` on a `step` cm step (major every 50 cm). */
export function gridLines(width: number, height: number, step = 10): GridLine[] {
  const out: GridLine[] = []
  for (let x = 0; x <= width; x += step) {
    out.push({ x1: x, y1: 0, x2: x, y2: height, major: x % 50 === 0 })
  }
  for (let y = 0; y <= height; y += step) {
    out.push({ x1: 0, y1: y, x2: width, y2: y, major: y % 50 === 0 })
  }
  return out
}

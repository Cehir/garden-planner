/** Rasterweite in cm: feine Linien und Einrasten beim Zeichnen/Verschieben. */
export const GRID_STEP = 10
/** Abstand der kräftigeren Hauptlinien in cm. */
export const GRID_MAJOR_STEP = 50
/** Abstand der Lineal-Beschriftung am Gartenrand in cm (Editor + Druck). */
export const RULER_LABEL_STEP = 100

export interface GridLine {
  x1: number
  y1: number
  x2: number
  y2: number
  major: boolean
}

/** Rasterlinien für einen Garten von `width`×`height` im Abstand `step` cm (Hauptlinie alle `GRID_MAJOR_STEP` cm). */
export function gridLines(width: number, height: number, step = GRID_STEP): GridLine[] {
  const out: GridLine[] = []
  for (let x = 0; x <= width; x += step) {
    out.push({ x1: x, y1: 0, x2: x, y2: height, major: x % GRID_MAJOR_STEP === 0 })
  }
  for (let y = 0; y <= height; y += step) {
    out.push({ x1: 0, y1: y, x2: width, y2: y, major: y % GRID_MAJOR_STEP === 0 })
  }
  return out
}

export interface RulerLabels {
  /** x-Positionen am oberen Rand (cm). */
  top: number[]
  /** y-Positionen am linken Rand (cm). */
  left: number[]
}

function labelSteps(length: number): number[] {
  const out: number[] = []
  for (let v = 0; v <= length; v += RULER_LABEL_STEP) out.push(v)
  return out
}

/** Positionen der Lineal-Beschriftung am oberen und linken Gartenrand, beginnend bei 0 (Editor + Druck). */
export function rulerLabels(width: number, height: number): RulerLabels {
  return { top: labelSteps(width), left: labelSteps(height) }
}

export const snap = (v: number, grid = GRID_STEP): number => Math.round(v / grid) * grid

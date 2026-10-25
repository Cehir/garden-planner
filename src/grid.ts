/** Rasterweite in cm: feine Linien und Einrasten beim Zeichnen/Verschieben. */
export const GRID_STEP = 10
/** Abstand der kräftigeren Hauptlinien in cm. */
export const GRID_MAJOR_STEP = 50
/** Abstand der Lineal-Beschriftung am Gartenrand in cm (Editor + Druck). */
const RULER_LABEL_STEP = 100

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

/** Schriftgröße der Lineal-Beschriftung (Editor + Druck). */
export const RULER_FONT_SIZE = 12
/** Abstand der Beschriftung vom Gartenrand (links) bzw. vom Messpunkt (rechter/unterer Rand). */
const RULER_INSET = 4
/** Grundlinie der linken Beschriftung knapp unter dem Messpunkt (Text steht etwa mittig). */
const RULER_LEFT_DY = 4
/**
 * Halbe Breite, die ein zentriertes oberes Label höchstens braucht (Ziffer ≈ 0,6 em, bis 4 Stellen).
 * Liegt ein Label näher am rechten Rand, wird es rechtsbündig gesetzt, damit es nicht abgeschnitten wird.
 */
const RULER_TOP_HALF_WIDTH = RULER_FONT_SIZE * 1.2
/** Grundlinie der oberen Beschriftung: Schrifthöhe + Abstand → Text steht innerhalb des Randes. */
const RULER_TOP_DY = RULER_FONT_SIZE + 2

export interface RulerLabel {
  /** Ecke oben links (einmal „0“), oberer Rand (x-Werte) oder linker Rand (y-Werte). */
  edge: 'corner' | 'top' | 'left'
  /** Beschriftung in cm. */
  value: number
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
  dx: number
  dy: number
}

function labelSteps(length: number): number[] {
  const out: number[] = []
  for (let v = RULER_LABEL_STEP; v <= length; v += RULER_LABEL_STEP) out.push(v)
  return out
}

/**
 * Lineal-Beschriftung am oberen und linken Gartenrand mit Position und Versatz (Editor + Druck):
 * die Ecke einmal mit 0, dann alle `RULER_LABEL_STEP` cm – alles innerhalb des Gartens, auch am
 * rechten und unteren Rand.
 */
export function rulerLabels(width: number, height: number): RulerLabel[] {
  return [
    { edge: 'corner', value: 0, x: 0, y: 0, anchor: 'start', dx: RULER_INSET, dy: RULER_TOP_DY },
    ...labelSteps(width).map((x): RulerLabel => (
      width - x < RULER_TOP_HALF_WIDTH
        // am rechten Rand: rechtsbündig, endet knapp links vom Messpunkt
        ? { edge: 'top', value: x, x, y: 0, anchor: 'end', dx: -RULER_INSET, dy: RULER_TOP_DY }
        : { edge: 'top', value: x, x, y: 0, anchor: 'middle', dx: 0, dy: RULER_TOP_DY }
    )),
    ...labelSteps(height).map((y): RulerLabel => ({
      edge: 'left', value: y, x: 0, y, anchor: 'start', dx: RULER_INSET,
      // am unteren Rand: Grundlinie über dem Messpunkt, sonst knapp darunter
      dy: height - y < RULER_LEFT_DY ? -RULER_INSET : RULER_LEFT_DY,
    })),
  ]
}

export const snap = (v: number, grid = GRID_STEP): number => Math.round(v / grid) * grid

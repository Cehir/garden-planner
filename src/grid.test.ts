import { describe, expect, it } from 'vitest'
import { gridLines, RULER_FONT_SIZE, rulerLabels, snap } from './grid'
import type { RulerLabel } from './grid'

describe('gridLines', () => {
  it('produces vertical + horizontal lines on the 10cm step', () => {
    const lines = gridLines(100, 100)
    const vertical = lines.filter((l) => l.x1 === l.x2)
    expect(vertical).toHaveLength(11) // 0..100 step 10
  })
  it('flags every 50th line as major', () => {
    const lines = gridLines(100, 0)
    const x50 = lines.find((l) => l.x1 === 50)
    expect(x50?.major).toBe(true)
    const x30 = lines.find((l) => l.x1 === 30)
    expect(x30?.major).toBe(false)
  })
  it('respects a custom step', () => {
    const lines = gridLines(100, 0, 25)
    const vertical = lines.filter((l) => l.x1 === l.x2)
    expect(vertical).toHaveLength(5) // 0,25,50,75,100
  })
})

describe('snap', () => {
  it('rounds to the 10cm grid by default', () => {
    expect(snap(14)).toBe(10)
    expect(snap(15)).toBe(20)
  })

  it('accepts a custom grid step', () => {
    expect(snap(37, 25)).toBe(25)
    expect(snap(38, 25)).toBe(50)
  })
})

describe('rulerLabels', () => {
  const values = (labels: RulerLabel[], edge: RulerLabel['edge']) =>
    labels.filter((l) => l.edge === edge).map((l) => l.value)

  it('labels the corner once with 0, then the top and left edge every 100cm', () => {
    const labels = rulerLabels(350, 200)
    expect(values(labels, 'corner')).toEqual([0])
    expect(values(labels, 'top')).toEqual([100, 200, 300])
    expect(values(labels, 'left')).toEqual([100, 200])
    expect(labels.filter((l) => l.value === 0)).toHaveLength(1)
  })

  it('includes the far edge when it falls on a label step', () => {
    const labels = rulerLabels(200, 100)
    expect(values(labels, 'top')).toEqual([100, 200])
    expect(values(labels, 'left')).toEqual([100])
  })

  it('places top labels on the top edge and left labels on the left edge', () => {
    const labels = rulerLabels(200, 200)
    expect(labels.find((l) => l.edge === 'top' && l.value === 100)).toMatchObject({ x: 100, y: 0 })
    expect(labels.find((l) => l.edge === 'left' && l.value === 100)).toMatchObject({ x: 0, y: 100 })
    expect(labels.find((l) => l.edge === 'corner')).toMatchObject({ x: 0, y: 0 })
  })

  it('keeps every label inside the garden (below y=0, right of x=0)', () => {
    for (const l of rulerLabels(300, 300)) {
      // Grundlinie unterhalb der Schrifthöhe → Text steht vollständig unter y=0
      expect(l.y + l.dy).toBeGreaterThanOrEqual(RULER_FONT_SIZE)
      // links/Ecke: linksbündig mit positivem Versatz, oben: zentriert um x ≥ 100
      const leftEdge = l.anchor === 'start' ? l.x + l.dx : l.x
      expect(leftEdge).toBeGreaterThan(0)
    }
  })
})

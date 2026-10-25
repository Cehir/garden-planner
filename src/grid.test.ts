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
    labels.filter((label) => label.edge === edge).map((label) => label.value)

  it('labels the corner once with 0, then the top and left edge every 100cm', () => {
    const labels = rulerLabels(350, 200)
    expect(values(labels, 'corner')).toEqual([0])
    expect(values(labels, 'top')).toEqual([100, 200, 300])
    expect(values(labels, 'left')).toEqual([100, 200])
    expect(labels.filter((label) => label.value === 0)).toHaveLength(1)
  })

  it('includes the far edge when it falls on a label step', () => {
    const labels = rulerLabels(200, 100)
    expect(values(labels, 'top')).toEqual([100, 200])
    expect(values(labels, 'left')).toEqual([100])
  })

  it('places top labels on the top edge and left labels on the left edge', () => {
    const labels = rulerLabels(200, 200)
    expect(labels.find((label) => label.edge === 'top' && label.value === 100)).toMatchObject({ x: 100, y: 0 })
    expect(labels.find((label) => label.edge === 'left' && label.value === 100)).toMatchObject({ x: 0, y: 100 })
    expect(labels.find((label) => label.edge === 'corner')).toMatchObject({ x: 0, y: 0 })
  })

  it('keeps labels clear of the top and left edge', () => {
    for (const label of rulerLabels(300, 300)) {
      // baseline at least one font size down → the text sits fully below y=0
      expect(label.y + label.dy).toBeGreaterThanOrEqual(RULER_FONT_SIZE)
    }
    for (const label of rulerLabels(300, 300).filter((label) => label.anchor === 'start')) {
      // left-aligned text (corner + left edge) starts right of x=0
      expect(label.x + label.dx).toBeGreaterThan(0)
    }
    for (const label of rulerLabels(300, 300).filter((label) => label.anchor === 'middle')) {
      // centred text (top edge) is a full label step away from the left edge
      expect(label.x).toBeGreaterThanOrEqual(100)
    }
  })

  it('right-aligns the last top label on the right edge so it stays inside', () => {
    const last = rulerLabels(300, 150).find((label) => label.edge === 'top' && label.value === 300)
    expect(last).toMatchObject({ x: 300, anchor: 'end' })
    expect(last!.dx).toBeLessThan(0)
  })

  it('right-aligns a top label that sits just short of the right edge', () => {
    const last = rulerLabels(305, 150).find((label) => label.edge === 'top' && label.value === 300)
    expect(last?.anchor).toBe('end')
  })

  it('keeps top labels well away from the right edge centred', () => {
    const labels = rulerLabels(350, 150).filter((label) => label.edge === 'top')
    expect(labels.map((label) => label.anchor)).toEqual(['middle', 'middle', 'middle'])
  })

  it('lifts the last left label on the bottom edge above it', () => {
    const last = rulerLabels(150, 200).find((label) => label.edge === 'left' && label.value === 200)
    expect(last).toMatchObject({ y: 200 })
    // baseline above the bottom edge → the text sits fully inside
    expect(last!.y + last!.dy).toBeLessThan(200)
  })

  it('keeps left labels clear of the bottom edge', () => {
    for (const height of [200, 201, 203, 250]) {
      for (const label of rulerLabels(150, height).filter((label) => label.edge === 'left')) {
        expect(label.y + label.dy).toBeLessThanOrEqual(height)
      }
    }
  })
})

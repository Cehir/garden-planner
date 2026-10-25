import { describe, expect, it } from 'vitest'
import { gridLines, rulerLabels, snap } from './grid'

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
  it('labels the top and left edge every 100cm, starting at 0', () => {
    expect(rulerLabels(350, 200)).toEqual({ top: [0, 100, 200, 300], left: [0, 100, 200] })
  })

  it('includes the far edge when it falls on a label step', () => {
    expect(rulerLabels(200, 100)).toEqual({ top: [0, 100, 200], left: [0, 100] })
  })
})

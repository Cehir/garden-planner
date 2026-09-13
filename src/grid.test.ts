import { describe, expect, it } from 'vitest'
import { gridLines } from './grid'

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

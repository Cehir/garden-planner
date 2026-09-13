import { describe, expect, it } from 'vitest'
import { BED_COLORS, PLANT_COLORS, DEFAULT_BED_COLOR } from './palette'

describe('palette', () => {
  it('provides non-empty distinct palettes', () => {
    expect(new Set(BED_COLORS).size).toBe(BED_COLORS.length)
    expect(PLANT_COLORS.length).toBeGreaterThan(0)
  })
  it('default bed color is part of the bed palette', () => {
    expect(BED_COLORS).toContain(DEFAULT_BED_COLOR)
  })
})

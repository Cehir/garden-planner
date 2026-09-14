import { describe, expect, it } from 'vitest'
import { normalizeState, createDefaultState, STORAGE_KEY } from './persistence'
import type { Plant } from './types'

describe('normalizeState', () => {
  it('coerces a legacy single MonthRange into an array', () => {
    const plant: Plant = {
      id: 'x', name: 'x', emoji: '🌿', color: '#000', spacing: 30, height: 30,
      light: 'full', soil: 'normal', family: 'andere',
      sow: [3, 6] as never, plant: [3, 6] as never, harvest: [6, 9] as never,
    }
    const out = normalizeState({ plants: [plant] })
    expect(out.plants[0].sow).toEqual([[3, 6]])
  })

  it('defaults a missing plantedYear to the current year', () => {
    const out = normalizeState({
      placedPlants: [{ id: 'p', bedId: 'b', plantId: 't', x: 0, y: 0, size: 20, plantedYear: NaN }],
    })
    expect(out.placedPlants[0].plantedYear).toBe(new Date().getFullYear())
  })

  it('falls back to defaults when raw is empty', () => {
    expect(normalizeState({}).garden.width).toBe(800)
  })
})

describe('createDefaultState', () => {
  it('returns a garden with default dimensions', () => {
    const s = createDefaultState()
    expect(s.garden).toEqual({ name: 'Mein Garten', width: 800, height: 600 })
  })
})

describe('STORAGE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof STORAGE_KEY).toBe('string')
    expect(STORAGE_KEY.length).toBeGreaterThan(0)
  })
})

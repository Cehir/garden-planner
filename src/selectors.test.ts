import { describe, expect, it } from 'vitest'
import { plantsById, placedCenter } from './selectors'
import type { Bed, PlacedPlant, Plant } from './types'

function plant(id: string): Plant {
  return {
    id,
    name: id,
    emoji: '🌿',
    color: '#000',
    spacing: 30,
    height: 30,
    light: 'full',
    soil: 'normal',
    family: 'andere',
    sow: [[3, 6]],
    plant: [[3, 6]],
    harvest: [[6, 9]],
  }
}

function bed(x: number, y: number, w: number, h: number): Bed {
  return { id: 'b', name: 'b', x, y, w, h, color: '#000', notes: '' }
}

function placed(x: number, y: number): PlacedPlant {
  return { id: 'p', bedId: 'b', plantId: 'tomate', x, y, size: 40, plantedYear: 2026 }
}

describe('plantsById', () => {
  it('maps plant id -> plant', () => {
    const m = plantsById([plant('tomate'), plant('salat')])
    expect(m.get('tomate')?.name).toBe('tomate')
    expect(m.size).toBe(2)
    expect(m.get('nope')).toBeUndefined()
  })
})

describe('placedCenter', () => {
  it('returns absolute garden coords of a placed plant center', () => {
    // bed at (10,20) 100x50, plant at rel (0.5, 0.5)
    const c = placedCenter(placed(0.5, 0.5), bed(10, 20, 100, 50))
    expect(c).toEqual({ x: 60, y: 45 })
  })
})

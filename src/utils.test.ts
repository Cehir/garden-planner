import { describe, expect, it } from 'vitest'
import { placedInYear } from './utils'
import type { PlacedPlant } from './types'

function placed(id: string, plantedYear: number): PlacedPlant {
  return { id, bedId: 'b1', plantId: `p-${id}`, x: 0.5, y: 0.5, size: 25, plantedYear }
}

describe('placedInYear', () => {
  it('liefert nur Pflanzen des selektierten Jahres', () => {
    const all = [placed('a', 2024), placed('b', 2026), placed('c', 2026)]
    const result = placedInYear(all, 2026)
    expect(result.map((p) => p.id)).toEqual(['b', 'c'])
  })

  it('behält die ursprüngliche Reihenfolge bei', () => {
    const all = [placed('a', 2027), placed('b', 2026), placed('c', 2027)]
    expect(placedInYear(all, 2027).map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('liefert eine leere Liste, wenn kein Jahr passt', () => {
    expect(placedInYear([placed('a', 2020)], 2026)).toEqual([])
  })

  it('funktioniert mit leerer Liste', () => {
    expect(placedInYear([], 2026)).toEqual([])
  })
})

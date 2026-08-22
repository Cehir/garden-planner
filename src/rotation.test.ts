import { describe, expect, it } from 'vitest'
import { bedCycle, familyOf, repeatWarnings } from './rotation'
import type { Bed, PlacedPlant, Plant } from './types'

const bed: Bed = { id: 'b1', name: 'Beet 1', x: 0, y: 0, w: 100, h: 100, color: '#fff', notes: '' }

const tomate: Plant = {
  id: 'tomate', name: 'Tomate', emoji: '🍅', color: '#e0534b', spacing: 60, height: 70,
  light: 'full', soil: 'humus', family: 'nacht-schatten', sow: [2, 4], plant: [5, 6], harvest: [7, 9],
}
const salat: Plant = {
  id: 'salat', name: 'Salat', emoji: '🥬', color: '#6dab4a', spacing: 30, height: 20,
  light: 'partial', soil: 'humus', family: 'kreuzbluetler', sow: [3, 8], plant: [4, 8], harvest: [6, 10],
}

function pp(id: string, plantId: string, year: number, bedId = 'b1'): PlacedPlant {
  return { id, bedId, plantId, x: 0.5, y: 0.5, size: 30, plantedYear: year }
}

describe('familyOf', () => {
  it('liefert die Familie der Pflanze', () => {
    expect(familyOf(tomate)).toBe('nacht-schatten')
  })

  it('unbekannte Pflanze -> andere', () => {
    expect(familyOf(undefined)).toBe('andere')
    expect(familyOf(null)).toBe('andere')
  })
})

describe('bedCycle', () => {
  it('berechnet min..max Jahr eines Beets', () => {
    expect(bedCycle([pp('a', 'tomate', 2025), pp('b', 'salat', 2026), pp('c', 'salat', 2027)], 'b1')).toEqual({ min: 2025, max: 2027 })
  })

  it('einzelnes Jahr', () => {
    expect(bedCycle([pp('a', 'tomate', 2026)], 'b1')).toEqual({ min: 2026, max: 2026 })
  })

  it('leere Beete / fremde Beete -> null', () => {
    expect(bedCycle([], 'b1')).toBeNull()
    expect(bedCycle([pp('a', 'tomate', 2025, 'b2')], 'b1')).toBeNull()
  })
})

describe('repeatWarnings', () => {
  const plants = [tomate, salat]

  it('gleiche Pflanze im Folgejahr -> Warnung', () => {
    const w = repeatWarnings([pp('a', 'tomate', 2026), pp('b', 'tomate', 2027)], plants, bed)
    expect(w).toHaveLength(2)
    expect(w[0].text).toContain('Tomate')
    expect(w[0].text).toContain('Nachtschattengewächse')
  })

  it('gleiche Pflanze mit Abstand >= 3 Jahren -> keine Warnung', () => {
    expect(repeatWarnings([pp('a', 'tomate', 2025), pp('b', 'tomate', 2028)], plants, bed)).toHaveLength(0)
  })

  it('gleiche Familie (Nachtschatten) im Folgejahr -> Warnung', () => {
    const chili: Plant = { ...tomate, id: 'chili', name: 'Chili' }
    const w = repeatWarnings([pp('a', 'tomate', 2026), pp('b', 'chili', 2027)], [tomate, chili], bed)
    expect(w).toHaveLength(2)
    expect(w[0].text).toContain('Nachtschattengewächse')
  })

  it('verschiedene Familien -> keine Warnung', () => {
    const w = repeatWarnings([pp('a', 'tomate', 2026), pp('b', 'salat', 2027)], plants, bed)
    expect(w).toHaveLength(0)
  })

  it('nur Pflanzen des angegebenen Beets', () => {
    const other = pp('x', 'tomate', 2027, 'b2')
    expect(repeatWarnings([pp('a', 'tomate', 2026), other], plants, bed)).toHaveLength(0)
  })

  it('sortiert nach Jahr, dann Name (deterministisch)', () => {
    const w = repeatWarnings(
      [pp('a', 'salat', 2027), pp('b', 'tomate', 2026), pp('c', 'salat', 2026), pp('d', 'tomate', 2027)],
      plants,
      bed,
    )
    expect(w.map((x) => x.year)).toEqual([2026, 2026, 2027, 2027])
    expect(w.map((x) => x.plantName)).toEqual(['Salat', 'Tomate', 'Salat', 'Tomate'])
  })

  it('Pflanze ohne Eintrag im Katalog -> Familie "andere" (Treiber-Fall)', () => {
    const w = repeatWarnings([pp('a', 'tomate', 2026), pp('b', 'salat', 2027)], [], bed)
    // Beide unbekannt -> gleiche Familie "andere" -> je eine Warnung
    expect(w).toHaveLength(2)
    expect(w[0].text).toContain('Unbekannt')
    expect(w[0].text).toContain('Sonstige')
  })
})

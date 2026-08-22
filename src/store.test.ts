import { describe, expect, it } from 'vitest'
import { createDefaultState, normalizeState } from './store'
import type { AppState, Plant } from './types'

function legacyPlant(overrides: Partial<Plant> = {}): Plant {
  // So sah ein Plant-Objekt aus, VOR der Saison-Erweiterung (keine sow/plant/harvest).
  return {
    id: 'alt',
    name: 'Alte Pflanze',
    emoji: '🌱',
    color: '#3f7d43',
    spacing: 30,
    height: 40,
    light: 'full',
    soil: 'humus',
    ...overrides,
  } as Plant
}

describe('normalizeState', () => {
  it('füllt fehlende Saison-Felder mit Defaults auf (alte localStorage-Daten)', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [legacyPlant()],
      placedPlants: [],
    }
    const result = normalizeState(raw)
    const [p] = result.plants
    expect(p.sow).toEqual([3, 6])
    expect(p.plant).toEqual([3, 6])
    expect(p.harvest).toEqual([6, 9])
  })

  it('erhält vorhandene Saison-Werte', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [legacyPlant({ sow: [11, 2], plant: [11, 2], harvest: [12, 3] })],
      placedPlants: [],
    }
    const result = normalizeState(raw)
    const [p] = result.plants
    expect(p.sow).toEqual([11, 2])
    expect(p.plant).toEqual([11, 2])
    expect(p.harvest).toEqual([12, 3])
  })

  it('füllt auch fehlende ältere Felder (spacing/height/light/soil) auf', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [
        {
          id: 'sehralt',
          name: 'Sehr alt',
          emoji: '🌿',
          color: '#000',
        } as Plant,
      ],
      placedPlants: [],
    }
    const [p] = normalizeState(raw).plants
    expect(p.spacing).toBe(25)
    expect(p.height).toBe(25)
    expect(p.light).toBe('full')
    expect(p.soil).toBe('normal')
    expect(p.sow).toEqual([3, 6])
  })

  it('ändert garden/beds/placedPlants nicht', () => {
    const raw: AppState = {
      garden: { name: 'G', width: 1, height: 2 },
      beds: [{ id: 'b1', name: 'Beet', x: 0, y: 0, w: 10, h: 10, color: '#fff', notes: 'n' }],
      plants: [legacyPlant()],
      placedPlants: [{ id: 'pp1', bedId: 'b1', plantId: 'alt', x: 0.5, y: 0.5, size: 30 }],
    }
    const result = normalizeState(raw)
    expect(result.garden).toEqual(raw.garden)
    expect(result.beds).toEqual(raw.beds)
    expect(result.placedPlants).toEqual(raw.placedPlants)
  })

  it('füllt fehlende family mit "andere" auf (Legacy-Daten)', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [legacyPlant()],
      placedPlants: [],
    }
    const [p] = normalizeState(raw).plants
    expect(p.family).toBe('andere')
  })
})

describe('createDefaultState', () => {
  it('liefert vollständigen Anfangszustand', () => {
    const s = createDefaultState()
    expect(s.garden).toEqual({ name: 'Mein Garten', width: 800, height: 600 })
    expect(s.beds).toEqual([])
    expect(s.placedPlants).toEqual([])
    expect(s.plants.length).toBeGreaterThanOrEqual(25)
    for (const p of s.plants) {
      expect(p.sow).toEqual([p.sow[0], p.sow[1]])
      expect(p.sow[0]).toBeGreaterThanOrEqual(1)
      expect(p.sow[0]).toBeLessThanOrEqual(12)
      expect(p.sow[1]).toBeGreaterThanOrEqual(1)
      expect(p.sow[1]).toBeLessThanOrEqual(12)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { createDefaultState, normalizeState, reducer } from './store'
import type { AppState, MonthRange, Plant } from './types'

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
    expect(p.sow).toEqual([[3, 6]])
    expect(p.plant).toEqual([[3, 6]])
    expect(p.harvest).toEqual([[6, 9]])
  })

  it('migriert vorhandene einzelne Fenster zu Arrays', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [
        legacyPlant({
          sow: [11, 2] as unknown as MonthRange[],
          plant: [11, 2] as unknown as MonthRange[],
          harvest: [12, 3] as unknown as MonthRange[],
        }),
      ],
      placedPlants: [],
    }
    const result = normalizeState(raw)
    const [p] = result.plants
    expect(p.sow).toEqual([[11, 2]])
    expect(p.plant).toEqual([[11, 2]])
    expect(p.harvest).toEqual([[12, 3]])
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
    expect(p.sow).toEqual([[3, 6]])
  })

  it('ändert garden/beds/placedPlants nicht', () => {
    const raw: AppState = {
      garden: { name: 'G', width: 1, height: 2 },
      beds: [{ id: 'b1', name: 'Beet', x: 0, y: 0, w: 10, h: 10, color: '#fff', notes: 'n' }],
      plants: [legacyPlant()],
      placedPlants: [{ id: 'pp1', bedId: 'b1', plantId: 'alt', x: 0.5, y: 0.5, size: 30, plantedYear: 2025 }],
      seeds: [],
      diary: [],
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

  it('füllt fehlendes plantedYear bei alten PlacedPlants mit dem aktuellen Jahr auf', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [{ id: 'b1', name: 'Beet', x: 0, y: 0, w: 10, h: 10, color: '#fff', notes: '' }],
      plants: [legacyPlant()],
      placedPlants: [
        { id: 'pp1', bedId: 'b1', plantId: 'alt', x: 0.5, y: 0.5, size: 30 },
      ] as unknown,
    } as unknown as AppState
    const pps = normalizeState(raw).placedPlants as unknown as { plantedYear: number }[]
    expect(pps[0].plantedYear).toBe(new Date().getFullYear())
  })

  it('erhält vorhandenes plantedYear', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [legacyPlant()],
      placedPlants: [
        { id: 'pp1', bedId: 'b1', plantId: 'alt', x: 0.5, y: 0.5, size: 30, plantedYear: 2028 },
      ],
    }
    const [pp] = normalizeState(raw).placedPlants
    expect(pp.plantedYear).toBe(2028)
  })

  it('füllt fehlende seeds mit leerem Array auf (Legacy-Daten)', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [legacyPlant()],
      placedPlants: [],
    }
    expect(normalizeState(raw).seeds).toEqual([])
  })

  it('füllt fehlende diary mit leerem Array auf (Legacy-Daten)', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [legacyPlant()],
      placedPlants: [],
    }
    expect(normalizeState(raw).diary).toEqual([])
  })

  it('erhält vorhandene diary-Einträge', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [legacyPlant()],
      placedPlants: [],
      seeds: [],
      diary: [
        { id: 'd1', date: '2026-09-02', timestamp: 1000, note: 'x', targets: [{ kind: 'bed' as const, bedId: 'b1', action: 'water' as const }] },
      ],
    }
    const result = normalizeState(raw as AppState)
    expect(result.diary).toHaveLength(1)
    expect(result.diary[0].id).toBe('d1')
  })

  it('erhält vorhandene seeds', () => {
    const raw = {
      garden: { name: 'Alt', width: 100, height: 50 },
      beds: [],
      plants: [legacyPlant()],
      placedPlants: [],
      diary: [],
      seeds: [
        {
          id: 's1',
          plantId: 'alt',
          name: 'San Marzano',
          producer: 'Testfirma',
          filled: '2026-01-01',
          expires: '2028-12-31',
        },
      ],
    }
    expect(normalizeState(raw as AppState).seeds).toEqual(raw.seeds)
  })
})

describe('reducer: updatePlacedPlant plantedYear', () => {
  it('setzt das Pflanzjahr einer platzierten Pflanze', async () => {
    const { reducer } = await import('./store')
    const s0: AppState = {
      garden: { name: 'G', width: 1, height: 1 },
      beds: [],
      plants: [],
      placedPlants: [{ id: 'pp1', bedId: 'b1', plantId: 'alt', x: 0.5, y: 0.5, size: 30, plantedYear: 2026 }],
      seeds: [],
      diary: [],
    }
    const s1 = reducer(s0, { type: 'updatePlacedPlant', id: 'pp1', patch: { plantedYear: 2028 } })
    expect(s1.placedPlants[0].plantedYear).toBe(2028)
  })
})

describe('createDefaultState', () => {
  it('liefert vollständigen Anfangszustand', () => {
    const s = createDefaultState()
    expect(s.garden).toEqual({ name: 'Mein Garten', width: 800, height: 600 })
    expect(s.beds).toEqual([])
    expect(s.placedPlants).toEqual([])
    expect(s.seeds).toEqual([])
    expect(s.diary).toEqual([])
    expect(s.plants.length).toBeGreaterThanOrEqual(25)
    for (const p of s.plants) {
      expect(p.sow.length).toBeGreaterThanOrEqual(1)
      expect(p.plant.length).toBeGreaterThanOrEqual(1)
      expect(p.harvest.length).toBeGreaterThanOrEqual(1)
      for (const r of p.sow) {
        expect(r[0]).toBeGreaterThanOrEqual(1)
        expect(r[0]).toBeLessThanOrEqual(12)
        expect(r[1]).toBeGreaterThanOrEqual(1)
        expect(r[1]).toBeLessThanOrEqual(12)
      }
    }
  })
})

describe('reducer: seeds', () => {
  const base: AppState = {
    garden: { name: 'G', width: 1, height: 1 },
    beds: [],
    plants: [{ id: 'p1', name: 'Tomate', emoji: '🍅', color: '#e0534b' } as Plant],
    placedPlants: [],
    seeds: [],
    diary: [],
  }

  it('fügt Saatgut hinzu', () => {
    const s1 = reducer(base, {
      type: 'addSeed',
      seed: {
        id: 's1',
        plantId: 'p1',
        name: 'San Marzano',
        producer: 'Testfirma',
        filled: '2026-01-01',
        expires: '2028-12-31',
      },
    })
    expect(s1.seeds).toHaveLength(1)
    expect(s1.seeds[0].plantId).toBe('p1')
  })

  it('aktualisiert Saatgut', () => {
    const withSeed = reducer(base, {
      type: 'addSeed',
      seed: { id: 's1', plantId: 'p1', name: 'A', producer: '', filled: '', expires: '' },
    })
    const s1 = reducer(withSeed, { type: 'updateSeed', id: 's1', patch: { producer: 'Neu' } })
    expect(s1.seeds[0].producer).toBe('Neu')
  })

  it('entfernt Saatgut', () => {
    const withSeed = reducer(base, {
      type: 'addSeed',
      seed: { id: 's1', plantId: 'p1', name: 'A', producer: '', filled: '', expires: '' },
    })
    const s1 = reducer(withSeed, { type: 'removeSeed', id: 's1' })
    expect(s1.seeds).toEqual([])
  })

  it('löscht Saatgut mit, wenn die zugehörige Pflanze entfernt wird', () => {
    const withSeed = reducer(base, {
      type: 'addSeed',
      seed: { id: 's1', plantId: 'p1', name: 'A', producer: '', filled: '', expires: '' },
    })
    const s1 = reducer(withSeed, { type: 'removePlant', id: 'p1' })
    expect(s1.seeds).toEqual([])
    expect(s1.plants).toEqual([])
  })
})

describe('reducer: diary', () => {
  const base: AppState = {
    garden: { name: 'G', width: 1, height: 1 },
    beds: [{ id: 'b1', name: 'Beet', x: 0, y: 0, w: 10, h: 10, color: '#fff', notes: '' }],
    plants: [{ id: 'p1', name: 'Tomate', emoji: '🍅', color: '#e0534b' } as Plant],
    placedPlants: [{ id: 'pp1', bedId: 'b1', plantId: 'p1', x: 0.5, y: 0.5, size: 30, plantedYear: 2026 }],
    seeds: [],
    diary: [],
  }

  it('fügt einen Tagebuch-Eintrag hinzu', () => {
    const s1 = reducer(base, {
      type: 'addDiaryEntry',
      entry: {
        id: 'd1',
        date: '2026-09-02',
        timestamp: 1000,
        note: 'Beet gegossen',
        targets: [{ kind: 'bed', bedId: 'b1', action: 'water' }],
      },
    })
    expect(s1.diary).toHaveLength(1)
    expect(s1.diary[0].targets[0]).toEqual({ kind: 'bed', bedId: 'b1', action: 'water' })
  })

  it('entfernt einen Tagebuch-Eintrag', () => {
    const withEntry = reducer(base, {
      type: 'addDiaryEntry',
      entry: { id: 'd1', date: '2026-09-02', timestamp: 1000, note: '', targets: [] },
    })
    const s1 = reducer(withEntry, { type: 'removeDiaryEntry', id: 'd1' })
    expect(s1.diary).toEqual([])
  })

  it('unterstützt Pflanzen-Ziele', () => {
    const s1 = reducer(base, {
      type: 'addDiaryEntry',
      entry: {
        id: 'd1',
        date: '2026-09-02',
        timestamp: 1000,
        note: '',
        targets: [{ kind: 'plant', placedPlantId: 'pp1', action: 'harvest' }],
      },
    })
    expect(s1.diary[0].targets[0]).toEqual({ kind: 'plant', placedPlantId: 'pp1', action: 'harvest' })
  })
})

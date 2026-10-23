import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultState, loadState, normalizeState, saveState } from './persistence'
import { DEFAULT_PLANTS } from './plants'
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

  it('ersetzt ein ungültiges plantedYear (NaN) durch das aktuelle Jahr', () => {
    const out = normalizeState({
      placedPlants: [{ id: 'p', bedId: 'b', plantId: 't', x: 0, y: 0, size: 20, plantedYear: NaN }],
    })
    expect(out.placedPlants[0].plantedYear).toBe(new Date().getFullYear())
  })

  it('fällt bei leerem Input auf Standardwerte zurück', () => {
    const out = normalizeState({})
    expect(out.garden.width).toBe(800)
    expect(out.beds).toEqual([])
    expect(out.diary).toEqual([])
    expect(out.plants).toEqual(DEFAULT_PLANTS)
  })

  it('behält eine bewusst leere Pflanzenliste bei', () => {
    expect(normalizeState({ plants: [] }).plants).toEqual([])
  })

  it('ersetzt Sammlungen, die keine Arrays sind, durch leere Arrays', () => {
    const raw = {
      garden: { name: 'G', width: 100, height: 50 },
      beds: 'x',
      plants: [legacyPlant()],
      placedPlants: {},
      seeds: {},
      diary: 'x',
    } as unknown as AppState
    const out = normalizeState(raw)
    expect(out.garden.name).toBe('G')
    expect(out.plants).toHaveLength(1)
    expect(out.beds).toEqual([])
    expect(out.placedPlants).toEqual([])
    expect(out.seeds).toEqual([])
    expect(out.diary).toEqual([])
  })

  it('verwirft Einträge, die keine Objekte sind (z. B. null aus einem kaputten Import)', () => {
    const raw = {
      garden: { name: 'G', width: 100, height: 50 },
      beds: [null, 'x'],
      plants: [null, legacyPlant(), 3],
      placedPlants: [null],
      seeds: [[]],
      diary: [null],
    } as unknown as AppState
    const out = normalizeState(raw)
    expect(out.beds).toEqual([])
    expect(out.plants.map((p) => p.id)).toEqual(['alt'])
    expect(out.placedPlants).toEqual([])
    expect(out.seeds).toEqual([])
    expect(out.diary).toEqual([])
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

describe('loadState / saveState', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('wirft nicht, wenn der Speicher voll oder gesperrt ist', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new DOMException('voll', 'QuotaExceededError')
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => saveState(createDefaultState())).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })

  it('liefert den Standardzustand, wenn nichts gespeichert ist', () => {
    expect(loadState()).toEqual(createDefaultState())
  })

  it('liest einen gespeicherten Zustand wieder ein', () => {
    const state = { ...createDefaultState(), garden: { name: 'Test', width: 300, height: 200 } }
    saveState(state)
    expect(loadState().garden).toEqual({ name: 'Test', width: 300, height: 200 })
  })

  it('behält den gespeicherten Garten, wenn seeds/diary beschädigt sind', () => {
    const state = { ...createDefaultState(), garden: { name: 'Test', width: 300, height: 200 } }
    localStorage.setItem('gartenplaner-state-v1', JSON.stringify({ ...state, seeds: {}, diary: 'x' }))
    const loaded = loadState()
    expect(loaded.garden.name).toBe('Test')
    expect(loaded.seeds).toEqual([])
    expect(loaded.diary).toEqual([])
  })

  it('behält die Beete, wenn plants/placedPlants fehlen oder null-Einträge enthalten', () => {
    const bed = { id: 'b1', name: 'Beet', x: 0, y: 0, w: 10, h: 10, color: '#fff', notes: '' }
    localStorage.setItem(
      'gartenplaner-state-v1',
      JSON.stringify({ garden: { name: 'Test', width: 300, height: 200 }, beds: [bed], plants: [null] }),
    )
    const loaded = loadState()
    expect(loaded.garden.name).toBe('Test')
    expect(loaded.beds).toEqual([bed])
    expect(loaded.plants).toEqual([])
    expect(loaded.placedPlants).toEqual([])
  })

  it('fällt bei unlesbarem JSON auf den Standardzustand zurück', () => {
    localStorage.setItem('gartenplaner-state-v1', '{kaputt')
    expect(loadState()).toEqual(createDefaultState())
  })
})

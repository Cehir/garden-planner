import { describe, expect, it } from 'vitest'
import { reducer } from './reducer'
import type { AppState, Plant } from './types'

describe('reducer: updatePlacedPlant plantedYear', () => {
  it('setzt das Pflanzjahr einer platzierten Pflanze', () => {
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

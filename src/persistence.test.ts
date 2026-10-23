import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultState, loadState, normalizeState, saveState } from './persistence'
import type { Plant } from './types'

describe('normalizeState', () => {
  it('wandelt einen alten einzelnen MonthRange in ein Array um', () => {
    const plant: Plant = {
      id: 'x',
      name: 'x',
      emoji: '🌿',
      color: '#000',
      spacing: 30,
      height: 30,
      light: 'full',
      soil: 'normal',
      family: 'andere',
      sow: [3, 6] as never,
      plant: [3, 6] as never,
      harvest: [6, 9] as never,
    }
    const out = normalizeState({ plants: [plant] })
    expect(out.plants[0].sow).toEqual([[3, 6]])
    expect(out.plants[0].harvest).toEqual([[6, 9]])
  })

  it('setzt ein fehlendes plantedYear auf das aktuelle Jahr', () => {
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
  })
})

describe('loadState / saveState', () => {
  beforeEach(() => localStorage.clear())

  it('liefert den Standardzustand, wenn nichts gespeichert ist', () => {
    expect(loadState()).toEqual(createDefaultState())
  })

  it('liest einen gespeicherten Zustand wieder ein', () => {
    const state = { ...createDefaultState(), garden: { name: 'Test', width: 300, height: 200 } }
    saveState(state)
    expect(loadState().garden).toEqual({ name: 'Test', width: 300, height: 200 })
  })

  it('fällt bei unlesbarem JSON auf den Standardzustand zurück', () => {
    localStorage.setItem('gartenplaner-state-v1', '{kaputt')
    expect(loadState()).toEqual(createDefaultState())
  })
})

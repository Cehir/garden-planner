import { describe, expect, it } from 'vitest'
import { bedStats } from './bedStats'
import { repeatWarnings } from './rotation'
import type { Bed, PlacedPlant, Plant } from './types'

function plant(id: string, height: number): Plant {
  return {
    id,
    name: id,
    emoji: '🌿',
    color: '#000',
    spacing: 30,
    height,
    light: 'full',
    soil: 'normal',
    family: 'andere',
    sow: [[3, 6]],
    plant: [[3, 6]],
    harvest: [[6, 9]],
  }
}

function bed(id: string, x: number): Bed {
  return { id, name: id, x, y: 0, w: 100, h: 100, color: '#000', notes: '' }
}

function placed(id: string, bedId: string, plantId: string, y: number, plantedYear = 2026): PlacedPlant {
  return { id, bedId, plantId, x: 0.5, y, size: 40, plantedYear }
}

const plants = [plant('mais', 200), plant('salat', 20)]
const beds = [bed('a', 0), bed('b', 200)]
// In jedem Beet steht der hohe Mais südlich (größeres y) vom Salat und beschattet ihn
const placedPlants = [
  placed('a-mais', 'a', 'mais', 0.9),
  placed('a-salat', 'a', 'salat', 0.3),
  placed('a-alt', 'a', 'salat', 0.5, 2025),
  placed('b-mais', 'b', 'mais', 0.9),
  placed('b-salat', 'b', 'salat', 0.3),
]

describe('bedStats', () => {
  it('zählt nur die Pflanzen des Beets im gewählten Jahr', () => {
    const stats = bedStats(placedPlants, plants, beds, beds[0], 2026)
    expect(stats.bedPlants.map((p) => p.id)).toEqual(['a-mais', 'a-salat'])
  })

  it('berechnet die Belegung aus den Kreisflächen der Pflanzen', () => {
    // 2 × π × 20² ≈ 2513 cm² von 10 000 cm²
    expect(bedStats(placedPlants, plants, beds, beds[0], 2026).utilization).toBe(25)
  })

  it('liefert 0 % Belegung für ein Beet ohne Fläche', () => {
    const flat = { ...beds[0], w: 0 }
    expect(bedStats(placedPlants, plants, [flat, beds[1]], flat, 2026).utilization).toBe(0)
  })

  it('filtert die Beschattungs-Konflikte auf das Beet', () => {
    const stats = bedStats(placedPlants, plants, beds, beds[0], 2026)
    expect(stats.conflicts.map((c) => [c.sourceId, c.targetId])).toEqual([['a-mais', 'a-salat']])
  })

  it('nimmt für die Fruchtfolge alle Jahre des Beets', () => {
    const stats = bedStats(placedPlants, plants, beds, beds[0], 2026)
    expect(stats.cycle).toEqual({ min: 2025, max: 2026 })
    expect(stats.rotation).toEqual(repeatWarnings(placedPlants, plants, beds[0]))
    expect(stats.rotation.length).toBeGreaterThan(0)
  })

  it('liefert keinen Zyklus für ein leeres Beet', () => {
    const empty = bed('c', 400)
    const stats = bedStats(placedPlants, plants, [...beds, empty], empty, 2026)
    expect(stats.bedPlants).toEqual([])
    expect(stats.cycle).toBeNull()
    expect(stats.conflicts).toEqual([])
  })
})

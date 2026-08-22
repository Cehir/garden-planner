import type { Bed, PlantFamily, PlacedPlant, Plant } from './types'
import { FAMILY_LABELS } from './types'

export interface RepeatWarning {
  year: number
  plantName: string
  family: PlantFamily
  text: string
}

/** Gleiche Familie darf nicht öfter als alle MIN_GAP Jahre auf dasselbe Beet. */
const MIN_GAP = 3

export function familyOf(plant: Plant | undefined | null): PlantFamily {
  return plant?.family ?? 'andere'
}

/** Min..max Pflanzjahr der Pflanzen in `bedId`. Null, wenn das Beet keine Pflanzen hat. */
export function bedCycle(
  placedPlants: PlacedPlant[],
  bedId: string,
): { min: number; max: number } | null {
  const years = placedPlants
    .filter((p) => p.bedId === bedId)
    .map((p) => p.plantedYear)
  if (years.length === 0) return null
  return { min: Math.min(...years), max: Math.max(...years) }
}

/**
 * Fruchtfolge-Warnungen für ein Beet: eine Pflanze, deren Familie kürzlich
 * (< MIN_GAP Jahre) im selben Beet stand, bekommt eine Warnung – egal ob dieselbe
 * Pflanze oder nur dieselbe Familie (z. B. Tomate nach Paprika).
 * Sortiert deterministisch nach Jahr, dann Name.
 */
export function repeatWarnings(
  placedPlants: PlacedPlant[],
  plants: Plant[],
  bed: Bed,
): RepeatWarning[] {
  const byId = new Map(plants.map((p) => [p.id, p]))
  const inBed = placedPlants
    .filter((p) => p.bedId === bed.id)
    .map((p) => ({ p, plant: byId.get(p.plantId) }))

  const warnings: RepeatWarning[] = []
  for (const { p, plant } of inBed) {
    const family = familyOf(plant)
    const repeat = inBed.some(
      ({ p: q, plant: qplant }) =>
        q.id !== p.id &&
        familyOf(qplant) === family &&
        Math.abs(q.plantedYear - p.plantedYear) < MIN_GAP,
    )
    if (repeat) {
      const name = plant?.name ?? 'Unbekannt'
      warnings.push({
        year: p.plantedYear,
        plantName: name,
        family,
        text: `${p.plantedYear} · ${name} (${FAMILY_LABELS[family]}) – gleiche Familie kürzlich im Beet`,
      })
    }
  }

  warnings.sort((a, b) => a.year - b.year || a.plantName.localeCompare(b.plantName, 'de'))
  return warnings
}

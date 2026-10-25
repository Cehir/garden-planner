import type { Bed, PlacedPlant, Plant } from './types'
import { bedCycle, repeatWarnings } from './rotation'
import type { RepeatWarning } from './rotation'
import { computeConflicts } from './shadow'
import type { ShadowConflict } from './shadow'
import { placedInYear } from './selection'

export interface BedStatsResult {
  /** Pflanzen des Beets im gewählten Jahr */
  bedPlants: PlacedPlant[]
  /** Belegte Fläche in Prozent (Kreisflächen der Pflanzen / Beetfläche) */
  utilization: number
  /** Beschattungs-Konflikte, an denen eine Pflanze des Beets beteiligt ist */
  conflicts: ShadowConflict[]
  /** Pflanzjahre über alle Jahre; null, wenn das Beet nie bepflanzt war */
  cycle: { min: number; max: number } | null
  rotation: RepeatWarning[]
}

/** Kennzahlen eines Beets für die Detail-Leiste (rein, ohne React). */
export function bedStats(
  placedPlants: PlacedPlant[],
  plants: Plant[],
  beds: Bed[],
  bed: Bed,
  year: number,
): BedStatsResult {
  const yearPlants = placedInYear(placedPlants, year)
  const bedPlants = yearPlants.filter((p) => p.bedId === bed.id)
  const totalArea = bed.w * bed.h
  const plantArea = bedPlants.reduce((sum, p) => sum + Math.PI * (p.size / 2) ** 2, 0)
  const bedPlantIds = new Set(bedPlants.map((p) => p.id))
  return {
    bedPlants,
    utilization: totalArea > 0 ? Math.round((plantArea / totalArea) * 100) : 0,
    conflicts: computeConflicts(yearPlants, plants, beds).filter(
      (c) => bedPlantIds.has(c.sourceId) || bedPlantIds.has(c.targetId),
    ),
    cycle: bedCycle(placedPlants, bed.id),
    rotation: repeatWarnings(placedPlants, plants, bed),
  }
}

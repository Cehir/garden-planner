import type { PlacedPlant } from './types'

/** Platzierte Pflanzen eines bestimmten Pflanzjahres (Jahresfilter für Plan und Beet-Panel). */
export function placedInYear(placedPlants: PlacedPlant[], year: number): PlacedPlant[] {
  return placedPlants.filter((p) => p.plantedYear === year)
}

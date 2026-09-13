import type { Bed, PlacedPlant, Plant } from './types'
import { plantsById } from './selectors'

export const SHADOW_LENGTH_FACTOR = 2.0

export interface ShadowShape {
  polygon: [number, number][]
  height: number
  plantId: string
}

export interface ShadowConflict {
  sourceId: string
  targetId: string
  sourceName: string
  targetName: string
  sourceHeight: number
  targetHeight: number
  message: string
}

function pointInPolygon(
  x: number,
  y: number,
  polygon: [number, number][],
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function shadowPolygon(
  plant: Plant,
  placed: PlacedPlant,
  bed: Bed,
): ShadowShape | null {
  if (plant.height <= 0) return null
  const cx = bed.x + placed.x * bed.w
  const cy = bed.y + placed.y * bed.h
  const r = placed.size / 2
  const length = plant.height * SHADOW_LENGTH_FACTOR
  const spread = Math.max(plant.spacing * 0.15, 5)
  const base = r * 1.4

  return {
    polygon: [
      [cx - base, cy + r * 0.5],
      [cx + base, cy + r * 0.5],
      [cx + base + spread, cy - length],
      [cx - base - spread, cy - length],
    ],
    height: plant.height,
    plantId: placed.id,
  }
}

export function computeConflicts(
  placedPlants: PlacedPlant[],
  plants: Plant[],
  beds: Bed[],
): ShadowConflict[] {
  const byId = plantsById(plants)
  const bedById = new Map(beds.map((b) => [b.id, b]))
  const conflicts: ShadowConflict[] = []

  for (const source of placedPlants) {
    const sourcePlant = byId.get(source.plantId)
    const sourceBed = bedById.get(source.bedId)
    if (!sourcePlant || !sourceBed || sourcePlant.height <= 0) continue
    const shape = shadowPolygon(sourcePlant, source, sourceBed)
    if (!shape) continue

    for (const target of placedPlants) {
      if (target.id === source.id) continue
      const targetPlant = byId.get(target.plantId)
      const targetBed = bedById.get(target.bedId)
      if (!targetPlant || !targetBed) continue
      if (targetPlant.light !== 'full') continue
      if (targetPlant.height >= sourcePlant.height) continue

      const tx = targetBed.x + target.x * targetBed.w
      const ty = targetBed.y + target.y * targetBed.h
      if (pointInPolygon(tx, ty, shape.polygon)) {
        conflicts.push({
          sourceId: source.id,
          targetId: target.id,
          sourceName: sourcePlant.name,
          targetName: targetPlant.name,
          sourceHeight: sourcePlant.height,
          targetHeight: targetPlant.height,
          message: `${sourcePlant.name} (${sourcePlant.height} cm) beschattet ${targetPlant.name} (braucht Sonne)`,
        })
      }
    }
  }

  return conflicts
}
import type { Bed, PlacedPlant, Plant, Point } from './types'

/** O(1) lookup of plants by id — the single source used everywhere. */
export function plantsById(plants: Plant[]): Map<string, Plant> {
  return new Map(plants.map((p) => [p.id, p]))
}

/** O(1) lookup of beds by id. */
export function bedsById(beds: Bed[]): Map<string, Bed> {
  return new Map(beds.map((b) => [b.id, b]))
}

/** Absolute garden-space center of a placed plant (bed origin + relative offset). */
export function placedCenter(placed: PlacedPlant, bed: Bed): Point {
  return { x: bed.x + placed.x * bed.w, y: bed.y + placed.y * bed.h }
}

/** Inverse of placedCenter: bed-relative (0–1) position of a garden point, clamped to the bed. */
export function relativeInBed(point: Point, bed: Bed): Point {
  return {
    x: Math.min(1, Math.max(0, (point.x - bed.x) / bed.w)),
    y: Math.min(1, Math.max(0, (point.y - bed.y) / bed.h)),
  }
}

import type { Bed, PlacedPlant, Plant, Point, Selected, Tool } from '../types'
import type { Action } from '../reducer'
import { placedCenter, relativeInBed } from '../selectors'
import { snap } from '../utils'
import { MIN_SIZE, hitTest, nearHandle, resizeRect } from './geometry'
import type { Handle, Rect } from './geometry'

export type DragState =
  | { kind: 'draw'; start: Point }
  | { kind: 'moveBed'; bedId: string; start: Point; orig: Point }
  | { kind: 'resizeBed'; bedId: string; handle: Handle; start: Point; orig: Rect }
  // orig: relative Position (0–1) im Beet
  | { kind: 'movePlaced'; id: string; bedId: string; start: Point; orig: Point }
  | { kind: 'resizePlaced'; id: string; center: Point; start: Point; origSize: number }

// Abstand (cm) zum Größen-Anfasser rechts an einer Pflanze
const PLACED_HANDLE_RADIUS = 10
// Grenzen (cm) für den Durchmesser einer gesetzten Pflanze beim Skalieren
const PLACED_MIN_SIZE = 10
const PLACED_MAX_SIZE = 200

export interface PointerDownContext {
  tool: Tool
  beds: Bed[]
  bedById: Map<string, Bed>
  visiblePlaced: PlacedPlant[]
  selectedBed: Bed | null
  selectedPlaced: PlacedPlant | null
  plantToPlace: Plant | null
}

export type PointerDownIntent =
  | { kind: 'drag'; drag: DragState; select?: Selected }
  | { kind: 'place'; plant: Plant; bed: Bed; rel: Point }
  | { kind: 'deselect' }
  | { kind: 'none' }

function movePlacedDrag(p: PlacedPlant, point: Point): DragState {
  return { kind: 'movePlaced', id: p.id, bedId: p.bedId, start: point, orig: { x: p.x, y: p.y } }
}

/** Entscheidet, was ein Klick an `point` auslöst (Reihenfolge = Priorität). */
export function pointerDownIntent(point: Point, ctx: PointerDownContext): PointerDownIntent {
  const { tool, beds, bedById, visiblePlaced, selectedBed, selectedPlaced, plantToPlace } = ctx

  if (tool === 'bed') {
    return { kind: 'drag', drag: { kind: 'draw', start: point } }
  }

  if (selectedPlaced) {
    const placedBed = bedById.get(selectedPlaced.bedId)
    if (placedBed) {
      const center = placedCenter(selectedPlaced, placedBed)
      if (Math.hypot(point.x - (center.x + selectedPlaced.size / 2), point.y - center.y) <= PLACED_HANDLE_RADIUS) {
        return {
          kind: 'drag',
          drag: { kind: 'resizePlaced', id: selectedPlaced.id, center, start: point, origSize: selectedPlaced.size },
        }
      }
    }
  }

  for (const p of visiblePlaced) {
    const bed = bedById.get(p.bedId)
    if (!bed) continue
    const { x: cx, y: cy } = placedCenter(p, bed)
    if (Math.hypot(point.x - cx, point.y - cy) <= p.size / 2) {
      return { kind: 'drag', drag: movePlacedDrag(p, point), select: { kind: 'placed', id: p.id } }
    }
  }

  if (tool === 'plant') {
    if (!plantToPlace) return { kind: 'none' }
    const bed = beds.find((b) => hitTest(point, b))
    if (!bed) return { kind: 'none' }
    return { kind: 'place', plant: plantToPlace, bed, rel: relativeInBed(point, bed) }
  }

  // Auswahl-Werkzeug
  if (selectedBed) {
    const handle = nearHandle(point, selectedBed)
    if (handle) {
      return {
        kind: 'drag',
        drag: {
          kind: 'resizeBed',
          bedId: selectedBed.id,
          handle,
          start: point,
          orig: { x: selectedBed.x, y: selectedBed.y, w: selectedBed.w, h: selectedBed.h },
        },
      }
    }
  }

  for (const bed of beds) {
    if (hitTest(point, bed)) {
      return {
        kind: 'drag',
        drag: { kind: 'moveBed', bedId: bed.id, start: point, orig: { x: bed.x, y: bed.y } },
        select: { kind: 'bed', id: bed.id },
      }
    }
  }

  return { kind: 'deselect' }
}

export type DragEffect = { kind: 'draft'; rect: Rect } | { kind: 'dispatch'; action: Action }

/** Wirkung einer Zeigerbewegung während eines laufenden Drags. */
export function dragMove(drag: DragState, point: Point, bedById: Map<string, Bed>): DragEffect | null {
  switch (drag.kind) {
    case 'draw': {
      const { start } = drag
      const x = Math.min(start.x, point.x)
      const y = Math.min(start.y, point.y)
      const w = Math.max(Math.abs(point.x - start.x), MIN_SIZE)
      const h = Math.max(Math.abs(point.y - start.y), MIN_SIZE)
      return { kind: 'draft', rect: { x: snap(x), y: snap(y), w: snap(w), h: snap(h) } }
    }
    case 'moveBed': {
      const dx = snap(point.x - drag.start.x)
      const dy = snap(point.y - drag.start.y)
      return {
        kind: 'dispatch',
        action: { type: 'updateBed', id: drag.bedId, patch: { x: drag.orig.x + dx, y: drag.orig.y + dy } },
      }
    }
    case 'resizeBed': {
      const rect = resizeRect(drag.orig, drag.handle, point.x - drag.start.x, point.y - drag.start.y)
      return { kind: 'dispatch', action: { type: 'updateBed', id: drag.bedId, patch: rect } }
    }
    case 'movePlaced': {
      const bed = bedById.get(drag.bedId)
      if (!bed) return null
      const absX = snap(drag.orig.x * bed.w + bed.x + (point.x - drag.start.x))
      const absY = snap(drag.orig.y * bed.h + bed.y + (point.y - drag.start.y))
      const rel = relativeInBed({ x: absX, y: absY }, bed)
      return { kind: 'dispatch', action: { type: 'updatePlacedPlant', id: drag.id, patch: rel } }
    }
    case 'resizePlaced': {
      const dist = Math.hypot(point.x - drag.center.x, point.y - drag.center.y)
      const size = Math.min(PLACED_MAX_SIZE, Math.max(PLACED_MIN_SIZE, snap(dist * 2, 5)))
      return { kind: 'dispatch', action: { type: 'updatePlacedPlant', id: drag.id, patch: { size } } }
    }
  }
}

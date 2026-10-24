import type { Bed, PlacedPlant, Plant, Selected, Tool } from '../types'
import type { Action } from '../reducer'
import { bedsById, placedCenter } from '../selectors'
import { snap } from '../utils'
import { MIN_SIZE, hitTest, nearHandle, resizeRect } from './geometry'
import type { Handle, Rect } from './geometry'

type Point = { x: number; y: number }

export type DragState =
  | { kind: 'draw'; startX: number; startY: number }
  | { kind: 'moveBed'; bedId: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resizeBed'; bedId: string; handle: Handle; startX: number; startY: number; orig: Rect }
  | {
      kind: 'movePlaced'
      id: string
      bedId: string
      startX: number
      startY: number
      origX: number
      origY: number
    }
  | {
      kind: 'resizePlaced'
      id: string
      centerX: number
      centerY: number
      startX: number
      startY: number
      origSize: number
    }

// Abstand (cm) zum Größen-Anfasser rechts an einer Pflanze
const PLACED_HANDLE_RADIUS = 10

export interface PointerDownContext {
  tool: Tool
  beds: Bed[]
  visiblePlaced: PlacedPlant[]
  selectedBed: Bed | null
  selectedPlaced: PlacedPlant | null
  plantToPlace: Plant | null
}

export type PointerDownIntent =
  | { kind: 'drag'; drag: DragState; select?: Selected }
  | { kind: 'place'; plant: Plant; bed: Bed; relX: number; relY: number }
  | { kind: 'deselect' }
  | { kind: 'none' }

function movePlacedDrag(p: PlacedPlant, point: Point): DragState {
  return { kind: 'movePlaced', id: p.id, bedId: p.bedId, startX: point.x, startY: point.y, origX: p.x, origY: p.y }
}

/** Entscheidet, was ein Klick an `point` auslöst (Reihenfolge = Priorität). */
export function pointerDownIntent(point: Point, ctx: PointerDownContext): PointerDownIntent {
  const { tool, beds, visiblePlaced, selectedBed, selectedPlaced } = ctx
  const bedById = bedsById(beds)

  if (tool === 'bed') {
    return { kind: 'drag', drag: { kind: 'draw', startX: point.x, startY: point.y } }
  }

  if (selectedPlaced) {
    const sbed = bedById.get(selectedPlaced.bedId)
    if (sbed) {
      const { x: cx, y: cy } = placedCenter(selectedPlaced, sbed)
      if (Math.hypot(point.x - (cx + selectedPlaced.size / 2), point.y - cy) <= PLACED_HANDLE_RADIUS) {
        return {
          kind: 'drag',
          drag: {
            kind: 'resizePlaced',
            id: selectedPlaced.id,
            centerX: cx,
            centerY: cy,
            startX: point.x,
            startY: point.y,
            origSize: selectedPlaced.size,
          },
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
    const plant = ctx.plantToPlace
    if (!plant) return { kind: 'none' }
    const bed = beds.find((b) => hitTest(point.x, point.y, b))
    if (!bed) return { kind: 'none' }
    const relX = Math.min(1, Math.max(0, (point.x - bed.x) / bed.w))
    const relY = Math.min(1, Math.max(0, (point.y - bed.y) / bed.h))
    return { kind: 'place', plant, bed, relX, relY }
  }

  // Auswahl-Werkzeug
  if (selectedBed) {
    const handle = nearHandle(point.x, point.y, selectedBed)
    if (handle) {
      return {
        kind: 'drag',
        drag: {
          kind: 'resizeBed',
          bedId: selectedBed.id,
          handle,
          startX: point.x,
          startY: point.y,
          orig: { x: selectedBed.x, y: selectedBed.y, w: selectedBed.w, h: selectedBed.h },
        },
      }
    }
  }

  for (const bed of beds) {
    if (hitTest(point.x, point.y, bed)) {
      return {
        kind: 'drag',
        drag: { kind: 'moveBed', bedId: bed.id, startX: point.x, startY: point.y, origX: bed.x, origY: bed.y },
        select: { kind: 'bed', id: bed.id },
      }
    }
  }

  return { kind: 'deselect' }
}

export type DragEffect = { kind: 'draft'; rect: Rect } | { kind: 'dispatch'; action: Action }

/** Wirkung einer Zeigerbewegung während eines laufenden Drags. */
export function dragMove(drag: DragState, point: Point, beds: Bed[]): DragEffect | null {
  switch (drag.kind) {
    case 'draw': {
      const x = Math.min(drag.startX, point.x)
      const y = Math.min(drag.startY, point.y)
      const w = Math.max(Math.abs(point.x - drag.startX), MIN_SIZE)
      const h = Math.max(Math.abs(point.y - drag.startY), MIN_SIZE)
      return { kind: 'draft', rect: { x: snap(x), y: snap(y), w: snap(w), h: snap(h) } }
    }
    case 'moveBed': {
      const dx = snap(point.x - drag.startX)
      const dy = snap(point.y - drag.startY)
      return {
        kind: 'dispatch',
        action: { type: 'updateBed', id: drag.bedId, patch: { x: drag.origX + dx, y: drag.origY + dy } },
      }
    }
    case 'resizeBed': {
      const rect = resizeRect(drag.orig, drag.handle, point.x - drag.startX, point.y - drag.startY)
      return { kind: 'dispatch', action: { type: 'updateBed', id: drag.bedId, patch: rect } }
    }
    case 'movePlaced': {
      const bed = beds.find((b) => b.id === drag.bedId)
      if (!bed) return null
      const absX = snap(drag.origX * bed.w + bed.x + (point.x - drag.startX))
      const absY = snap(drag.origY * bed.h + bed.y + (point.y - drag.startY))
      const relX = Math.min(1, Math.max(0, (absX - bed.x) / bed.w))
      const relY = Math.min(1, Math.max(0, (absY - bed.y) / bed.h))
      return { kind: 'dispatch', action: { type: 'updatePlacedPlant', id: drag.id, patch: { x: relX, y: relY } } }
    }
    case 'resizePlaced': {
      const dist = Math.hypot(point.x - drag.centerX, point.y - drag.centerY)
      const size = Math.min(200, Math.max(10, snap(dist * 2, 5)))
      return { kind: 'dispatch', action: { type: 'updatePlacedPlant', id: drag.id, patch: { size } } }
    }
  }
}

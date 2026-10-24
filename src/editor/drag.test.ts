import { describe, expect, it } from 'vitest'
import type { Bed, PlacedPlant } from '../types'
import { DEFAULT_PLANTS } from '../plants'
import { bedsById } from '../selectors'
import { dragMove, pointerDownIntent } from './drag'
import type { DragState, PointerDownContext } from './drag'

const bed: Bed = { id: 'b1', name: 'Beet 1', x: 100, y: 100, w: 200, h: 100, color: '#000', notes: '' }
// Mittelpunkt (200, 150), Radius 20
const placed: PlacedPlant = { id: 'p1', bedId: 'b1', plantId: 'x', x: 0.5, y: 0.5, size: 40, plantedYear: 2026 }

function ctx(over: Partial<PointerDownContext> = {}): PointerDownContext {
  return {
    tool: 'select',
    beds: [bed],
    bedById: bedsById([bed]),
    visiblePlaced: [placed],
    selectedBed: null,
    selectedPlaced: null,
    plantToPlace: null,
    ...over,
  }
}

const plant = DEFAULT_PLANTS[0]

describe('pointerDownIntent', () => {
  it('Beet-Werkzeug startet immer ein Aufziehen', () => {
    expect(pointerDownIntent({ x: 5, y: 5 }, ctx({ tool: 'bed' }))).toEqual({
      kind: 'drag',
      drag: { kind: 'draw', startX: 5, startY: 5 },
    })
  })
  it('Klick auf eine Pflanze wählt sie aus und startet das Verschieben', () => {
    const r = pointerDownIntent({ x: 205, y: 150 }, ctx())
    expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'movePlaced', id: 'p1' }, select: { kind: 'placed', id: 'p1' } })
  })
  it('Anfasser der ausgewählten Pflanze startet die Größenänderung', () => {
    const r = pointerDownIntent({ x: 220, y: 150 }, ctx({ selectedPlaced: placed }))
    expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'resizePlaced', id: 'p1', centerX: 200, centerY: 150, origSize: 40 } })
  })
  it('Pflanzen-Werkzeug setzt relativ zum Beet', () => {
    expect(pointerDownIntent({ x: 150, y: 125 }, ctx({ tool: 'plant', plantToPlace: plant }))).toEqual({
      kind: 'place',
      plant,
      bed,
      relX: 0.25,
      relY: 0.25,
    })
  })
  it('Pflanzen-Werkzeug ohne gewählte Pflanze oder außerhalb eines Beets tut nichts', () => {
    expect(pointerDownIntent({ x: 150, y: 125 }, ctx({ tool: 'plant' })).kind).toBe('none')
    expect(pointerDownIntent({ x: 10, y: 10 }, ctx({ tool: 'plant', plantToPlace: plant })).kind).toBe('none')
  })
  it('Anfasser des ausgewählten Beets startet die Größenänderung', () => {
    const r = pointerDownIntent({ x: 300, y: 200 }, ctx({ selectedBed: bed }))
    expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'resizeBed', bedId: 'b1', handle: 'se' } })
  })
  it('Klick ins Beet wählt es aus und startet das Verschieben', () => {
    const r = pointerDownIntent({ x: 110, y: 110 }, ctx())
    expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'moveBed', bedId: 'b1', origX: 100, origY: 100 }, select: { kind: 'bed', id: 'b1' } })
  })
  it('Klick ins Leere hebt die Auswahl auf', () => {
    expect(pointerDownIntent({ x: 10, y: 10 }, ctx()).kind).toBe('deselect')
  })

  describe('Priorität bei überlappenden Zielen', () => {
    // Mittelpunkt (220, 150) = Größen-Anfasser von p1; liegt auch noch im Kreis von p1
    const other: PlacedPlant = { ...placed, id: 'p2', x: 0.6 }
    // Mittelpunkt (300, 200) = Südost-Anfasser des Beets
    const corner: PlacedPlant = { ...placed, id: 'p3', x: 1, y: 1, size: 20 }

    it('Anfasser der ausgewählten Pflanze schlägt Pflanzen darunter', () => {
      const r = pointerDownIntent({ x: 220, y: 150 }, ctx({ visiblePlaced: [placed, other], selectedPlaced: placed }))
      expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'resizePlaced', id: 'p1' } })
    })
    it('ohne Auswahl gewinnt die erste getroffene Pflanze', () => {
      const r = pointerDownIntent({ x: 220, y: 150 }, ctx({ visiblePlaced: [placed, other] }))
      expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'movePlaced', id: 'p1' } })
    })
    it('Pflanzen-Werkzeug auf einer vorhandenen Pflanze verschiebt sie statt neu zu pflanzen', () => {
      const r = pointerDownIntent({ x: 200, y: 150 }, ctx({ tool: 'plant', plantToPlace: plant }))
      expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'movePlaced', id: 'p1' }, select: { kind: 'placed', id: 'p1' } })
    })
    it('Pflanze auf dem Beet-Anfasser schlägt die Beet-Größenänderung', () => {
      const r = pointerDownIntent({ x: 300, y: 200 }, ctx({ visiblePlaced: [corner], selectedBed: bed }))
      expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'movePlaced', id: 'p3' } })
    })
    it('Beet-Anfasser schlägt das Verschieben des Beets', () => {
      const r = pointerDownIntent({ x: 300, y: 200 }, ctx({ visiblePlaced: [], selectedBed: bed }))
      expect(r).toMatchObject({ kind: 'drag', drag: { kind: 'resizeBed', handle: 'se' } })
    })
  })
})

describe('dragMove', () => {
  const bedById = bedsById([bed])
  it('Aufziehen liefert ein eingerastetes Entwurfsrechteck, mindestens MIN_SIZE', () => {
    const drag: DragState = { kind: 'draw', startX: 100, startY: 100 }
    expect(dragMove(drag, { x: 52, y: 107 }, new Map())).toEqual({ kind: 'draft', rect: { x: 50, y: 100, w: 50, h: 20 } })
  })
  it('Größenänderung nach Osten um 30 vergrößert die Breite', () => {
    const drag: DragState = { kind: 'resizeBed', bedId: 'b1', handle: 'e', startX: 300, startY: 150, orig: bed }
    expect(dragMove(drag, { x: 330, y: 150 }, bedById)).toEqual({
      kind: 'dispatch',
      action: { type: 'updateBed', id: 'b1', patch: { x: 100, y: 100, w: 230, h: 100 } },
    })
  })
  it('Verschieben eines Beets rastet ein', () => {
    const drag: DragState = { kind: 'moveBed', bedId: 'b1', startX: 0, startY: 0, origX: 100, origY: 100 }
    expect(dragMove(drag, { x: 23, y: -7 }, bedById)).toEqual({
      kind: 'dispatch',
      action: { type: 'updateBed', id: 'b1', patch: { x: 120, y: 90 } },
    })
  })
  it('Verschieben einer Pflanze begrenzt die relativen Koordinaten auf [0,1]', () => {
    const drag: DragState = { kind: 'movePlaced', id: 'p1', bedId: 'b1', startX: 200, startY: 150, origX: 0.5, origY: 0.5 }
    expect(dragMove(drag, { x: 1000, y: -1000 }, bedById)).toEqual({
      kind: 'dispatch',
      action: { type: 'updatePlacedPlant', id: 'p1', patch: { x: 1, y: 0 } },
    })
  })
  it('Verschieben einer Pflanze ohne Beet bewirkt nichts', () => {
    const drag: DragState = { kind: 'movePlaced', id: 'p1', bedId: 'weg', startX: 0, startY: 0, origX: 0, origY: 0 }
    expect(dragMove(drag, { x: 10, y: 10 }, bedById)).toBeNull()
  })
  it('Größenänderung einer Pflanze ist auf 10–200 begrenzt', () => {
    const drag: DragState = { kind: 'resizePlaced', id: 'p1', centerX: 0, centerY: 0, startX: 0, startY: 0, origSize: 40 }
    expect(dragMove(drag, { x: 1, y: 0 }, new Map())).toMatchObject({ action: { patch: { size: 10 } } })
    expect(dragMove(drag, { x: 500, y: 0 }, new Map())).toMatchObject({ action: { patch: { size: 200 } } })
    expect(dragMove(drag, { x: 31, y: 0 }, new Map())).toMatchObject({ action: { patch: { size: 60 } } })
  })
})

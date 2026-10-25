import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps, Dispatch } from 'react'
import { StoreProvider } from '../store'
import { useHistory, useStoreDispatch, useStoreState } from '../storeContext'
import type { HistoryControls } from '../storeContext'
import type { Action } from '../reducer'
import type { AppState, Bed, PlacedPlant } from '../types'
import { createDefaultState, saveState } from '../persistence'
import Editor from './Editor'

// happy-dom liefert keine Screen-CTM: Identität, also Client- = SVG-Koordinaten
beforeEach(() => {
  vi.spyOn(SVGSVGElement.prototype, 'getScreenCTM').mockReturnValue(new DOMMatrix())
})
afterEach(() => vi.restoreAllMocks())

const bed: Bed = { id: 'b1', name: 'Beet 1', x: 100, y: 100, w: 200, h: 100, color: '#000', notes: '' }
// Mittelpunkt (200, 150), Radius 20
const placed: PlacedPlant = { id: 'p1', bedId: 'b1', plantId: 'x', x: 0.5, y: 0.5, size: 40, plantedYear: 2026 }

function renderEditor(props: Partial<ComponentProps<typeof Editor>> = {}) {
  const states: AppState[] = []
  const histories: HistoryControls[] = []
  const dispatches: Dispatch<Action>[] = []
  function Probe() {
    states.push(useStoreState())
    histories.push(useHistory())
    dispatches.push(useStoreDispatch())
    return null
  }
  function tree(showEditor: boolean) {
    return (
      <StoreProvider>
        {showEditor && (
          <Editor
            tool="select"
            selected={null}
            onSelect={() => {}}
            plantToPlace={null}
            zoom={1}
            season="all"
            phase="plant"
            showRotation={false}
            year={2026}
            {...props}
          />
        )}
        <Probe />
      </StoreProvider>
    )
  }
  const utils = render(tree(true))
  const svg = utils.container.querySelector('svg.editor-svg')!
  return {
    ...utils,
    svg,
    state: () => states[states.length - 1],
    history: () => histories[histories.length - 1],
    dispatch: () => dispatches[dispatches.length - 1],
    // Nur den Editor aushängen, der Store bleibt bestehen
    unmountEditor: () => utils.rerender(tree(false)),
  }
}

// Beet b1 von (110, 110) aus um (dx, dy) ziehen, in mehreren Schritten
function dragBed(svg: Element, dx: number, dy: number) {
  fireEvent.pointerDown(svg, { button: 0, pointerId: 1, clientX: 110, clientY: 110 })
  for (let i = 1; i <= 4; i++) {
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 110 + (dx * i) / 4, clientY: 110 + (dy * i) / 4 })
  }
}

describe('Editor', () => {
  beforeEach(() => {
    localStorage.clear()
    saveState({ ...createDefaultState(), beds: [bed], placedPlants: [placed] })
  })

  it('zeichnet Beete und Pflanzen aus dem Store', () => {
    const { container } = renderEditor()
    expect(container.querySelectorAll('g.bed')).toHaveLength(1)
    expect(container.querySelectorAll('g.plant')).toHaveLength(1)
  })

  it('Klick auf eine Pflanze wählt sie aus', () => {
    const onSelect = vi.fn()
    const { svg } = renderEditor({ onSelect })
    fireEvent.pointerDown(svg, { button: 0, pointerId: 1, clientX: 205, clientY: 150 })
    expect(onSelect).toHaveBeenCalledWith({ kind: 'placed', id: 'p1' })
  })

  it('ein ausgewähltes Beet zeigt acht Anfasser', () => {
    const { container } = renderEditor({ selected: { kind: 'bed', id: 'b1' } })
    expect(container.querySelectorAll('rect.resize-handle')).toHaveLength(8)
  })

  it('Aufziehen mit dem Beet-Werkzeug legt ein Beet an und wählt es aus', () => {
    const onSelect = vi.fn()
    const { svg, state } = renderEditor({ tool: 'bed', onSelect })
    fireEvent.pointerDown(svg, { button: 0, pointerId: 1, clientX: 400, clientY: 400 })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 452, clientY: 431 })
    fireEvent.pointerUp(svg, { pointerId: 1 })
    const added = state().beds[1]
    expect(added).toMatchObject({ name: 'Beet 2', x: 400, y: 400, w: 50, h: 30 })
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'bed', id: added.id })
  })

  it('Pflanzen-Werkzeug setzt die gewählte Pflanze ins Beet', () => {
    const plant = createDefaultState().plants[0]
    const { svg, state } = renderEditor({ tool: 'plant', plantToPlace: plant })
    fireEvent.pointerDown(svg, { button: 0, pointerId: 1, clientX: 150, clientY: 125 })
    expect(state().placedPlants[1]).toMatchObject({
      bedId: 'b1',
      plantId: plant.id,
      x: 0.25,
      y: 0.25,
      size: plant.spacing,
      plantedYear: 2026,
    })
  })
})

describe('Editor: zugängliche Namen', () => {
  beforeEach(() => {
    localStorage.clear()
    const tomato = createDefaultState().plants.find((p) => p.name === 'Tomate')!
    saveState({
      ...createDefaultState(),
      beds: [bed, { ...bed, id: 'b2', name: '', x: 400 }],
      placedPlants: [{ ...placed, plantId: tomato.id }, { ...placed, id: 'p2', plantId: 'gibt-es-nicht' }],
    })
  })

  it('benennt den Plan, Beete und gesetzte Pflanzen', () => {
    renderEditor()
    expect(screen.getByRole('group', { name: 'Gartenplan' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Beet: Beet 1' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Beet: ohne Namen' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Tomate in Beet 1' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Unbekannte Pflanze in Beet 1' })).toBeInTheDocument()
  })

  it('markiert das ausgewählte Beet mit aria-current', () => {
    renderEditor({ selected: { kind: 'bed', id: 'b1' } })
    expect(screen.getByRole('group', { name: 'Beet: Beet 1' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('group', { name: 'Beet: ohne Namen' })).not.toHaveAttribute('aria-current')
  })

  it('markiert die ausgewählte Pflanze und benennt ihren Größen-Anfasser', () => {
    renderEditor({ selected: { kind: 'placed', id: 'p1' } })
    expect(screen.getByRole('group', { name: 'Tomate in Beet 1' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('img', { name: 'Pflanzengröße ändern' })).toBeInTheDocument()
  })

  it('benennt Schattenwurf und Schattenkonflikt', () => {
    localStorage.clear()
    // Tomate (70 cm hoch) wirft ihren Schatten nach Norden auf die sonnenhungrige Chili (40 cm)
    saveState({
      ...createDefaultState(),
      beds: [{ ...bed, h: 200 }],
      placedPlants: [
        { ...placed, plantId: 'tomate', y: 0.8, size: 60 },
        { ...placed, id: 'p2', plantId: 'chili', y: 0.4, size: 40 },
      ],
    })
    renderEditor()
    expect(screen.getByRole('img', { name: 'Schatten: Tomate' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Schatten: Chili' })).toBeInTheDocument()
    const chili = screen.getByRole('group', { name: 'Chili in Beet 1' })
    expect(within(chili).getByRole('img', { name: 'Schattenkonflikt' })).toBeInTheDocument()
    const tomate = screen.getByRole('group', { name: 'Tomate in Beet 1' })
    expect(within(tomate).queryByRole('img', { name: 'Schattenkonflikt' })).toBeNull()
  })

  it('benennt die acht Beet-Anfasser nach Himmelsrichtung', () => {
    renderEditor({ selected: { kind: 'bed', id: 'b1' } })
    const names = screen.getAllByRole('img', { name: /^Beetgröße ändern: / }).map((h) => h.getAttribute('aria-label'))
    expect(names).toEqual([
      'Beetgröße ändern: Nordwest',
      'Beetgröße ändern: Nord',
      'Beetgröße ändern: Nordost',
      'Beetgröße ändern: Ost',
      'Beetgröße ändern: Südost',
      'Beetgröße ändern: Süd',
      'Beetgröße ändern: Südwest',
      'Beetgröße ändern: West',
    ])
  })
})

describe('Editor: Undo beim Ziehen', () => {
  beforeEach(() => {
    localStorage.clear()
    saveState({ ...createDefaultState(), beds: [bed], placedPlants: [placed] })
  })

  it('viele Bewegungen bis pointerup ergeben genau einen Undo-Schritt', () => {
    const { svg, state, history } = renderEditor()
    dragBed(svg, 40, 20)
    fireEvent.pointerUp(svg, { pointerId: 1 })
    expect(state().beds[0]).toMatchObject({ x: 140, y: 120 })

    act(() => history().undo())
    expect(state().beds[0]).toMatchObject({ x: 100, y: 100 })
    expect(history().canUndo).toBe(false)
  })

  it('Undo/Redo wird während des Ziehens ignoriert', () => {
    const { svg, state, history } = renderEditor()
    dragBed(svg, 40, 20)
    act(() => history().undo())
    expect(state().beds[0]).toMatchObject({ x: 140, y: 120 })
    fireEvent.pointerUp(svg, { pointerId: 1 })
  })

  it('pointercancel schließt die Transaktion', () => {
    const { svg, state, history } = renderEditor()
    dragBed(svg, 40, 20)
    fireEvent.pointerCancel(svg, { pointerId: 1 })

    act(() => history().undo())
    expect(state().beds[0]).toMatchObject({ x: 100, y: 100 })
  })

  it('Unmount mitten im Ziehen schließt die Transaktion', () => {
    const { svg, state, history, unmountEditor } = renderEditor()
    dragBed(svg, 40, 20)
    unmountEditor()

    act(() => history().undo())
    expect(state().beds[0]).toMatchObject({ x: 100, y: 100 })
  })
})

describe('Editor: Ziehgesten-Transaktion', () => {
  beforeEach(() => localStorage.clear())

  it('schließt die Transaktion bei verlorenem Pointer-Capture ohne pointerup', () => {
    const { svg, history, dispatch } = renderEditor({ tool: 'bed' })
    fireEvent.pointerDown(svg, { button: 0, pointerId: 1 })
    fireEvent.lostPointerCapture(svg, { pointerId: 1 })

    act(() =>
      dispatch()({
        type: 'addBed',
        bed: { id: 'b1', name: 'Beet', x: 0, y: 0, w: 50, h: 50, color: '#fff', notes: '' },
      }),
    )
    // Ohne geschlossene Transaktion würde addBed darin verschwinden und Undo ignoriert
    expect(history().canUndo).toBe(true)
  })
})

import { act, fireEvent, render } from '@testing-library/react'
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
  function Probe() {
    states.push(useStoreState())
    histories.push(useHistory())
    return null
  }
  const utils = render(
    <StoreProvider>
      <Editor
        tool="select"
        selected={null}
        onSelect={() => {}}
        placedPlant={null}
        zoom={1}
        season="all"
        phase="plant"
        showRotation={false}
        year={2026}
        {...props}
      />
      <Probe />
    </StoreProvider>,
  )
  const svg = utils.container.querySelector('svg.editor-svg')!
  return {
    ...utils,
    svg,
    state: () => states[states.length - 1],
    history: () => histories[histories.length - 1],
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
    const { svg, state } = renderEditor({ tool: 'plant', placedPlant: plant })
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
    const histories: HistoryControls[] = []
    const states: AppState[] = []
    function Probe() {
      histories.push(useHistory())
      states.push(useStoreState())
      return null
    }
    function Harness({ showEditor }: { showEditor: boolean }) {
      return (
        <StoreProvider>
          {showEditor && (
            <Editor
              tool="select"
              selected={null}
              onSelect={() => {}}
              placedPlant={null}
              zoom={1}
              season="all"
              phase="plant"
              showRotation={false}
              year={2026}
            />
          )}
          <Probe />
        </StoreProvider>
      )
    }
    const { container, rerender } = render(<Harness showEditor />)
    dragBed(container.querySelector('svg.editor-svg')!, 40, 20)
    rerender(<Harness showEditor={false} />)

    act(() => histories[histories.length - 1].undo())
    expect(states[states.length - 1].beds[0]).toMatchObject({ x: 100, y: 100 })
  })
})

describe('Editor: Ziehgesten-Transaktion', () => {
  beforeEach(() => localStorage.clear())

  it('schließt die Transaktion bei verlorenem Pointer-Capture ohne pointerup', () => {
    const histories: HistoryControls[] = []
    const dispatches: Dispatch<Action>[] = []
    function Probe() {
      histories.push(useHistory())
      dispatches.push(useStoreDispatch())
      return null
    }

    const { container } = render(
      <StoreProvider>
        <Editor
          tool="bed"
          selected={null}
          onSelect={() => {}}
          placedPlant={null}
          zoom={1}
          season="all"
          phase="plant"
          showRotation={false}
          year={2026}
        />
        <Probe />
      </StoreProvider>,
    )
    const svg = container.querySelector('svg.editor-svg')!
    fireEvent.pointerDown(svg, { button: 0, pointerId: 1 })
    fireEvent.lostPointerCapture(svg, { pointerId: 1 })

    act(() =>
      dispatches[0]({
        type: 'addBed',
        bed: { id: 'b1', name: 'Beet', x: 0, y: 0, w: 50, h: 50, color: '#fff', notes: '' },
      }),
    )
    // Ohne geschlossene Transaktion würde addBed darin verschwinden und Undo ignoriert
    expect(histories[histories.length - 1].canUndo).toBe(true)
  })
})

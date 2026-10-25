import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StoreProvider } from '../store'
import { createDefaultState, saveState } from '../persistence'
import { useStoreDispatch } from '../storeContext'
import Toolbar from './Toolbar'

const THIS_YEAR = new Date().getFullYear()

function view() {
  return { tool: 'select' as const, zoom: 1, season: 'all' as const, phase: 'plant' as const, showRotation: false, year: THIS_YEAR }
}

function handlers() {
  return { tool: vi.fn(), zoom: vi.fn(), season: vi.fn(), phase: vi.fn(), showRotation: vi.fn(), year: vi.fn() }
}

function actions() {
  return { fit: vi.fn(), print: vi.fn(), export: vi.fn(), import: vi.fn(), reset: vi.fn() }
}

function RenameGarden() {
  const dispatch = useStoreDispatch()
  return (
    <button type="button" onClick={() => dispatch({ type: 'setGarden', patch: { name: 'Neu' } })}>
      Umbenennen
    </button>
  )
}

function renderToolbar(onView = handlers(), act = actions()) {
  render(
    <StoreProvider>
      <Toolbar view={view()} onView={onView} actions={act} />
      <RenameGarden />
    </StoreProvider>,
  )
  return { onView, act }
}

beforeEach(() => {
  localStorage.clear()
  saveState({
    ...createDefaultState(),
    garden: { name: 'Hof', width: 800, height: 600 },
    placedPlants: [{ id: 'p1', bedId: 'b1', plantId: 'tomate', x: 0.5, y: 0.5, size: 40, plantedYear: 2020 }],
  })
})

describe('Toolbar', () => {
  it('zeigt Gartenname und Maße aus dem Store', () => {
    renderToolbar()
    expect(screen.getByText('Hof · 800×600 cm')).toBeInTheDocument()
  })

  it('meldet Werkzeug, Zoom und Ansicht über onView', () => {
    const { onView } = renderToolbar()
    fireEvent.click(screen.getByRole('button', { name: 'Beet zeichnen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vergrößern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Verkleinern' }))
    fireEvent.click(screen.getByRole('button', { name: /Fruchtfolge/ }))
    expect(onView.tool).toHaveBeenCalledWith('bed')
    expect(onView.zoom).toHaveBeenNthCalledWith(1, 1.25)
    expect(onView.zoom).toHaveBeenNthCalledWith(2, 0.8)
    expect(onView.showRotation).toHaveBeenCalledWith(true)
  })

  it('bietet die Pflanzjahre plus das aktuelle Jahr an, neueste zuerst', () => {
    const { onView } = renderToolbar()
    const select = screen.getByDisplayValue(String(THIS_YEAR))
    const years = [...select.querySelectorAll('option')].map((o) => o.value)
    expect(years).toEqual([String(THIS_YEAR), '2020'])
    fireEvent.change(select, { target: { value: '2020' } })
    expect(onView.year).toHaveBeenCalledWith(2020)
  })

  it('löst die Aktionen aus', () => {
    const { act } = renderToolbar()
    fireEvent.click(screen.getByRole('button', { name: 'Fit' }))
    fireEvent.click(screen.getByRole('button', { name: /Drucken/ }))
    fireEvent.click(screen.getByRole('button', { name: /Export/ }))
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }))
    expect(act.fit).toHaveBeenCalledOnce()
    expect(act.print).toHaveBeenCalledOnce()
    expect(act.export).toHaveBeenCalledOnce()
    expect(act.reset).toHaveBeenCalledOnce()
  })

  it('übergibt eine importierte Datei an actions.import', () => {
    const { act } = renderToolbar()
    const file = new File(['{}'], 'plan.json', { type: 'application/json' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    expect(act.import).toHaveBeenCalledWith(file)
  })

  it('nimmt Rückgängig/Wiederholen aus der History', () => {
    renderToolbar()
    const undo = screen.getByRole('button', { name: 'Rückgängig' })
    const redo = screen.getByRole('button', { name: 'Wiederholen' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Umbenennen' }))
    expect(screen.getByText('Neu · 800×600 cm')).toBeInTheDocument()
    expect(undo).toBeEnabled()

    fireEvent.click(undo)
    expect(screen.getByText('Hof · 800×600 cm')).toBeInTheDocument()
    expect(redo).toBeEnabled()
  })
})

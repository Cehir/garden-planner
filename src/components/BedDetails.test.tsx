import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StoreProvider } from '../store'
import { createDefaultState, saveState } from '../persistence'
import type { Selected } from '../types'
import BedDetails from './BedDetails'

const BED = { id: 'b1', name: 'Hochbeet', x: 0, y: 0, w: 100, h: 100, color: '#8bc34a', notes: '' }
const PLACED = { id: 'p1', bedId: 'b1', plantId: 'tomate', x: 0.5, y: 0.5, size: 40, plantedYear: 2026 }

beforeEach(() => {
  localStorage.clear()
  saveState({ ...createDefaultState(), beds: [BED], placedPlants: [PLACED] })
})

function details(selected: Selected | null, onClearSelection = vi.fn()) {
  return <BedDetails selected={selected} onClearSelection={onClearSelection} year={2026} />
}

describe('BedDetails', () => {
  it('zeigt ohne Auswahl die Garten-Einstellungen', () => {
    render(<StoreProvider>{details(null)}</StoreProvider>)
    expect(screen.getByRole('heading', { name: 'Garten' })).toBeInTheDocument()
    expect(screen.getByLabelText('Breite (cm)')).toBeInTheDocument()
  })

  it('wechselt zum Tagebuch und behält den Tab über eine Beet-Auswahl hinweg', () => {
    const { rerender } = render(<StoreProvider>{details(null)}</StoreProvider>)
    fireEvent.click(screen.getByRole('button', { name: /Tagebuch/ }))
    expect(screen.getByRole('heading', { name: 'Neuer Eintrag' })).toBeInTheDocument()

    rerender(<StoreProvider>{details({ kind: 'bed', id: 'b1' })}</StoreProvider>)
    expect(screen.getByRole('heading', { name: 'Beet' })).toBeInTheDocument()

    rerender(<StoreProvider>{details(null)}</StoreProvider>)
    expect(screen.getByRole('heading', { name: 'Neuer Eintrag' })).toBeInTheDocument()
  })

  it('zeigt für ein Beet Name und Kennzahlen des Jahres', () => {
    render(<StoreProvider>{details({ kind: 'bed', id: 'b1' })}</StoreProvider>)
    expect(screen.getByDisplayValue('Hochbeet')).toBeInTheDocument()
    expect(screen.getByText(/Pflanzen · Jahr 2026/)).toHaveTextContent('1 Pflanzen · Jahr 2026')
    expect(screen.getByText(/belegt/)).toHaveTextContent('13% belegt')
    expect(screen.getByText(/Fruchtfolge: 2026 → 2026/)).toBeInTheDocument()
  })

  it('löscht das Beet und hebt die Auswahl auf', () => {
    const onClear = vi.fn()
    render(<StoreProvider>{details({ kind: 'bed', id: 'b1' }, onClear)}</StoreProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Beet löschen' }))
    expect(onClear).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: 'Garten' })).toBeInTheDocument()
  })

  it('zeigt eine platzierte Pflanze und entfernt sie', () => {
    render(<StoreProvider>{details({ kind: 'placed', id: 'p1' })}</StoreProvider>)
    expect(screen.getByRole('heading', { name: 'Pflanze' })).toBeInTheDocument()
    expect(screen.getByText(/Beet: Hochbeet/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pflanze entfernen' }))
    expect(screen.getByText(/Beet: –/)).toBeInTheDocument()
  })
})

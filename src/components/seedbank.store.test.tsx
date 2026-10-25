import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StoreProvider } from '../store'
import { useHistory } from '../storeContext'
import SeedBank from './SeedBank'

beforeEach(() => {
  localStorage.clear()
})

function UndoButton() {
  const { undo, canUndo } = useHistory()
  return (
    <button type="button" onClick={undo} disabled={!canUndo}>
      Undo
    </button>
  )
}

function renderSeedBank() {
  return render(
    <StoreProvider>
      <SeedBank />
      <UndoButton />
    </StoreProvider>,
  )
}

function addSeed(name: string) {
  fireEvent.click(screen.getByRole('button', { name: /Saatgut hinzufügen/ }))
  fireEvent.change(screen.getByRole('combobox', { name: /Pflanze/ }), { target: { value: 'tomate' } })
  fireEvent.change(screen.getByRole('textbox', { name: /Sorte/ }), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))
}

describe('SeedBank im StoreProvider', () => {
  it('zeigt neu hinzugefügtes Saatgut an', () => {
    renderSeedBank()
    expect(screen.getByText('0 Saatgut')).toBeInTheDocument()

    addSeed('Ochsenherz')

    expect(screen.getByText('1 Saatgut')).toBeInTheDocument()
    expect(screen.getByText(/Ochsenherz/)).toBeInTheDocument()
  })

  it('macht das Hinzufügen per useHistory().undo rückgängig', () => {
    renderSeedBank()
    addSeed('Ochsenherz')

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByText('0 Saatgut')).toBeInTheDocument()
    expect(screen.queryByText(/Ochsenherz/)).not.toBeInTheDocument()
  })
})

describe('SeedBank – Bearbeiten', () => {
  function editFirst() {
    fireEvent.click(screen.getByRole('button', { name: '✏️' }))
  }

  it('füllt das Formular mit dem Saatgut und sperrt die Pflanzenwahl', () => {
    renderSeedBank()
    addSeed('Ochsenherz')
    editFirst()
    expect(screen.getByRole('heading', { name: 'Saatgut bearbeiten' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Sorte/ })).toHaveValue('Ochsenherz')
    expect(screen.getByRole('textbox', { name: /Sorte/ })).toHaveAttribute('placeholder', 'z.B. Tomate')
    expect(screen.getByRole('combobox', { name: /Pflanze/ })).toBeDisabled()
  })

  it('speichert Änderungen und schließt das Formular', () => {
    renderSeedBank()
    addSeed('Ochsenherz')
    editFirst()
    fireEvent.change(screen.getByRole('textbox', { name: /Sorte/ }), { target: { value: '  Berner Rose ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(screen.queryByRole('heading', { name: 'Saatgut bearbeiten' })).not.toBeInTheDocument()
    expect(screen.getByText('Berner Rose')).toBeInTheDocument()
    expect(screen.queryByText(/Ochsenherz/)).not.toBeInTheDocument()
  })

  it('löscht das Saatgut', () => {
    renderSeedBank()
    addSeed('Ochsenherz')
    editFirst()
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    expect(screen.getByText('0 Saatgut')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Saatgut hinzufügen/ })).toBeInTheDocument()
  })

  it('verwirft Änderungen beim Abbrechen und startet danach leer', () => {
    renderSeedBank()
    addSeed('Ochsenherz')
    editFirst()
    fireEvent.change(screen.getByRole('textbox', { name: /Sorte/ }), { target: { value: 'Verworfen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(screen.getByText('Ochsenherz')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Saatgut hinzufügen/ }))
    expect(screen.getByRole('textbox', { name: /Sorte/ })).toHaveValue('')
  })

  it('übernimmt den Pflanzenfilter als Vorauswahl beim Hinzufügen', () => {
    renderSeedBank()
    fireEvent.change(screen.getByDisplayValue('Alle Pflanzen'), { target: { value: 'tomate' } })
    fireEvent.click(screen.getByRole('button', { name: /Saatgut hinzufügen/ }))
    expect(screen.getByRole('combobox', { name: /Pflanze/ })).toHaveValue('tomate')
    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeEnabled()
  })

  it('zeigt für abgelaufenes Saatgut ein Abzeichen', () => {
    renderSeedBank()
    fireEvent.click(screen.getByRole('button', { name: /Saatgut hinzufügen/ }))
    fireEvent.change(screen.getByRole('combobox', { name: /Pflanze/ }), { target: { value: 'tomate' } })
    fireEvent.change(screen.getByLabelText('Haltbarkeitsdatum'), { target: { value: '2000-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    expect(screen.getByText('⚠️ abgelaufen')).toHaveClass('badge', 'expired')
  })
})

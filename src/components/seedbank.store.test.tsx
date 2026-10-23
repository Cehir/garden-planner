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

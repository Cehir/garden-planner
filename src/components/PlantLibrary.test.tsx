import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StoreProvider } from '../store'
import { DEFAULT_PLANTS } from '../plants'
import { canDoNow } from '../seasons'
import PlantLibrary from './PlantLibrary'

// Reale aktuelle Monatszahl (getMonth()+1) – Testdaten unabhängig davon
const CURRENT_MONTH = new Date().getMonth() + 1

// Kollisionssichere Textsuche: Wortgrenzen, damit z. B. "Lauch" nicht in "Schnittlauch" trifft
function nameRegex(name: string) {
  return new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b')
}

function countByName(name: string) {
  return screen.queryAllByText(nameRegex(name)).length
}

beforeEach(() => {
  localStorage.clear()
})

function renderLibrary() {
  return render(
    <StoreProvider>
      <PlantLibrary plantToPlace={null} onPick={vi.fn()} />
    </StoreProvider>,
  )
}

describe('PlantLibrary – "Jetzt pflanzbar"-Filter', () => {
  it('zeigt den gesamten Katalog, wenn Filter aus ist', () => {
    renderLibrary()
    for (const p of DEFAULT_PLANTS) {
      expect(countByName(p.name)).toBeGreaterThanOrEqual(1)
    }
  })

  it('filtert auf Pflanzen, die im aktuellen Monat aussa- oder pflanztbar sind', () => {
    // sanity: Katalog enthält mindestens eine pflanz- UND eine nicht-pflanzbare Pflanze
    const included = DEFAULT_PLANTS.find((p) => canDoNow(p, CURRENT_MONTH))
    const excluded = DEFAULT_PLANTS.find((p) => !canDoNow(p, CURRENT_MONTH))
    expect(included).toBeTruthy()
    expect(excluded).toBeTruthy()

    renderLibrary()
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAccessibleName(/Jetzt pflanzbar/)

    // Vor dem Klick sind beide sichtbar
    expect(countByName(included!.name)).toBeGreaterThanOrEqual(1)
    expect(countByName(excluded!.name)).toBeGreaterThanOrEqual(1)

    fireEvent.click(checkbox)

    // Nach dem Klick: pflanzbare bleibt, nicht-pflanzbare verschwindet
    expect(countByName(included!.name)).toBeGreaterThanOrEqual(1)
    expect(countByName(excluded!.name)).toBe(0)

    // Filter wieder aufheben → beide sichtbar
    fireEvent.click(checkbox)
    expect(countByName(excluded!.name)).toBeGreaterThanOrEqual(1)
  })

  it('nested kein Button in einem anderen Button (ungültiges HTML)', () => {
    renderLibrary()
    // Die Zeile einer Pflanze ist ein rolemarkierter Button; der ✏️-Button
    // darf darin enthalten sein, aber nicht in einem echten <button> verschachtelt.
    const rows = screen.getAllByRole('button').filter((el) =>
      el.classList.contains('plant-item'),
    )
    expect(rows.length).toBeGreaterThanOrEqual(1)
    for (const row of rows) {
      expect(row.tagName).not.toBe('BUTTON')
      const inner = row.querySelector('button')
      expect(inner).not.toBeNull()
      expect(inner!.parentElement).toBe(row)
      expect(row.querySelector('button button')).toBeNull()
    }
  })

  it('öffnet über den ✏️-Button die Bearbeitungsansicht, ohne die Auswahl zu ändern', () => {
    const onPick = vi.fn()
    render(
      <StoreProvider>
        <PlantLibrary plantToPlace={null} onPick={onPick} />
      </StoreProvider>,
    )
    const first = DEFAULT_PLANTS[0]
    const editBtn = screen.getByRole('button', { name: `${first.name} bearbeiten` })
    fireEvent.click(editBtn)
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByText('Pflanze bearbeiten')).toBeInTheDocument()
  })
})

describe('PlantLibrary – Pflanzen-Formular', () => {
  it('fügt ohne Namen keine Pflanze hinzu und lässt das Formular offen', () => {
    renderLibrary()
    const before = screen.getAllByRole('button', { name: /— Platzieren$/ }).length
    fireEvent.click(screen.getByRole('button', { name: /Pflanze hinzufügen/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    expect(screen.getByText('Neue Pflanze')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /— Platzieren$/ })).toHaveLength(before)
  })

  it('fügt mit Namen eine Pflanze hinzu und schließt das Formular', () => {
    renderLibrary()
    fireEvent.click(screen.getByRole('button', { name: /Pflanze hinzufügen/ }))
    fireEvent.change(screen.getByPlaceholderText('z.B. Mangold'), { target: { value: 'Mangold' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    expect(screen.queryByText('Neue Pflanze')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mangold — Platzieren' })).toBeInTheDocument()
  })

  it('übernimmt beim Bearbeiten den alten Namen, wenn das Feld leer ist', () => {
    renderLibrary()
    const first = DEFAULT_PLANTS[0]
    fireEvent.click(screen.getByRole('button', { name: `${first.name} bearbeiten` }))
    fireEvent.change(screen.getByDisplayValue(first.name), { target: { value: '  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(screen.getByRole('button', { name: `${first.name} — Platzieren` })).toBeInTheDocument()
  })
})

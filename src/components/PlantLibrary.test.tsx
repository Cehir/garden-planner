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
      <PlantLibrary placedPlant={null} onPick={vi.fn()} tool="select" />
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
        <PlantLibrary placedPlant={null} onPick={onPick} tool="select" />
      </StoreProvider>,
    )
    const first = DEFAULT_PLANTS[0]
    const editBtn = screen.getByRole('button', { name: `${first.name} bearbeiten` })
    fireEvent.click(editBtn)
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByText('Pflanze bearbeiten')).toBeInTheDocument()
  })
})

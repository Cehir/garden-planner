import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

// Regression for issue #1: selecting a plant in the library used to keep the
// previous tool active, so the "click to place" hint was a lie and clicks
// inside the plan were handled by the wrong tool.

describe('Issue #1 – Pflanze auswählen aktiviert das Pflanz-Werkzeug', () => {
  it('schaltet beim Klick auf eine Pflanze ins Pflanz-Tool und zeigt den Platzier-Hinweis', () => {
    render(<App />)

    const plant = screen.getByRole('button', { name: 'Tomate — Platzieren' })
    expect(plant).not.toHaveAttribute('title', /Pflanze platzieren.*aktivieren/)
    expect(plant).toHaveAttribute('title', 'Klicken, um zu platzieren')

    const plantTool = screen
      .getAllByRole('button')
      .find((b) => b.getAttribute('title') === 'Pflanze platzieren (P)')!
    expect(plantTool).not.toHaveClass('active')

    fireEvent.click(plant)

    expect(plantTool).toHaveClass('active')
    expect(
      screen.getByText(/Klicke in ein Beet, um „Tomate“ zu platzieren\./),
    ).toBeInTheDocument()
  })
})

import { test as base, expect } from '@playwright/test'
import type { AppState, Bed, Garden, PlacedPlant } from '../src/types'
import { createDefaultState, normalizeState, STORAGE_KEY } from '../src/persistence'

// Wie Partial<AppState>, aber auch der Garten darf nur teilweise angegeben werden
type StatePatch = Omit<Partial<AppState>, 'garden'> & { garden?: Partial<Garden> }
type SeedState = (patch?: StatePatch) => Promise<void>

// Merker in sessionStorage: überlebt einen Reload im selben Tab, nicht aber einen neuen Tab
const SEEDED_FLAG = 'e2e-seeded'

// `seedState` legt vor dem ersten Laden einen Zustand in localStorage ab – nur einmal pro Tab,
// damit ein Reload den inzwischen von der App gespeicherten Stand nicht überschreibt.
// Läuft wie ein Import durch normalizeState, Lücken werden also mit Standardwerten gefüllt.
export const test = base.extend<{ seedState: SeedState }>({
  seedState: async ({ page }, use) => {
    await use(async (patch = {}) => {
      const defaults = createDefaultState()
      const state = normalizeState({ ...defaults, ...patch, garden: { ...defaults.garden, ...patch.garden } })
      await page.addInitScript(
        ([flag, key, value]) => {
          if (sessionStorage.getItem(flag)) return
          localStorage.setItem(key, value)
          sessionStorage.setItem(flag, '1')
        },
        [SEEDED_FLAG, STORAGE_KEY, JSON.stringify(state)],
      )
    })
  },
})

export { expect }

// Beispieldaten für mehrere Specs
export const currentYear = new Date().getFullYear()
export const sampleBed: Bed = { id: 'b1', name: 'Hochbeet', x: 200, y: 200, w: 200, h: 120, color: '#8bc34a', notes: '' }
// Tomate in der Beetmitte, Durchmesser 60 cm
export const sampleTomato: PlacedPlant = {
  id: 'p1',
  bedId: 'b1',
  plantId: 'tomate',
  x: 0.5,
  y: 0.5,
  size: 60,
  plantedYear: currentYear,
}

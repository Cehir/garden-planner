import { test as base, expect } from '@playwright/test'
import type { AppState, Garden } from '../src/types'
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

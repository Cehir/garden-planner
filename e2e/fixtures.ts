import { test as base, expect } from '@playwright/test'
import type { AppState } from '../src/types'
import { createDefaultState, STORAGE_KEY } from '../src/persistence'

type Seed = (patch?: Partial<AppState>) => Promise<void>

// `seed` legt vor dem ersten Laden einen Zustand in localStorage ab. Nur einmal pro Tab
// (Merker in sessionStorage), damit ein Reload den inzwischen gespeicherten Stand nicht überschreibt.
export const test = base.extend<{ seed: Seed }>({
  seed: async ({ page }, use) => {
    await use(async (patch = {}) => {
      const state: AppState = { ...createDefaultState(), ...patch }
      await page.addInitScript(
        ([key, value]) => {
          if (sessionStorage.getItem('e2e-seeded')) return
          localStorage.setItem(key, value)
          sessionStorage.setItem('e2e-seeded', '1')
        },
        [STORAGE_KEY, JSON.stringify(state)],
      )
    })
  },
})

export { expect }

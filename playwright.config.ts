import { defineConfig, devices } from '@playwright/test'

// Eigener Port, damit ein laufender `npm run preview` (4173) nicht versehentlich mitgetestet wird
const PORT = 4180

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Immer: oxlints jest-Regeln erkennen `test.only` aus ./fixtures nicht. Fokussieren per `-g <Name>`
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /\.mobile\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: /\.mobile\.spec\.ts$/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // vite build ohne tsc: in wenigen hundert ms fertig. Läuft auf dem Port schon ein Server
    // (reuseExistingServer, nur lokal), wird nicht gebaut – dann testet man dessen Stand.
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})

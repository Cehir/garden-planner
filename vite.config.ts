/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind IPv4 loopback so local tooling/readiness checks (127.0.0.1) reach the dev server.
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})

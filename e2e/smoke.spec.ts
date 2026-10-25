import { expect, test } from './fixtures'
import type { Bed } from '../src/types'

const bed: Bed = { id: 'b1', name: 'Hochbeet', x: 100, y: 100, w: 200, h: 120, color: '#8bc34a', notes: '' }

test.describe('Smoke', () => {
  test('lädt die App ohne Konsolenfehler', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

    await page.goto('/')
    await expect(page).toHaveTitle('Gartenplaner')
    await expect(page.getByRole('group', { name: 'Gartenplan' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('zeigt einen vorbelegten Zustand', async ({ page, seedState }) => {
    await seedState({ beds: [bed], garden: { width: 600 } })
    await page.goto('/')
    await expect(page.getByRole('group', { name: 'Beet: Hochbeet' })).toBeVisible()
    await expect(page.getByRole('spinbutton', { name: /Breite/ })).toHaveValue('600')
  })

  test('Änderungen in der App überleben das Neuladen', async ({ page, seedState }) => {
    await seedState({ beds: [bed] })
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Name' }).fill('Testgarten')

    // Ohne den Einmal-Merker in seedState würde der Reload den Namen zurücksetzen
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Testgarten')
    await expect(page.getByRole('group', { name: 'Beet: Hochbeet' })).toBeVisible()
  })
})

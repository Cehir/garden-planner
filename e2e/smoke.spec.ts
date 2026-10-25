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

  test('zeigt einen vorbelegten Zustand und behält ihn nach dem Neuladen', async ({ page, seed }) => {
    await seed({ beds: [bed] })
    await page.goto('/')
    await expect(page.getByRole('group', { name: 'Beet: Hochbeet' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('group', { name: 'Beet: Hochbeet' })).toBeVisible()
  })
})

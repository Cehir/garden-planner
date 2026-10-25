import { expect, test } from './fixtures'

test.describe('Smoke (mobil)', () => {
  test('zeigt Gartenplan und die Knöpfe der mobilen Seitenleiste', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('group', { name: 'Gartenplan' })).toBeVisible()
    await expect(page.getByRole('button', { name: '🌿 Pflanzen' })).toBeVisible()
  })
})

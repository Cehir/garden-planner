import { expect, test } from './fixtures'
import { gardenPlan } from './editor'
import { fmt, isInside } from './geometry'

// Standardgröße (Labels genau am rechten/unteren Rand), knapp darüber, länglich und sehr klein
const sizes = [
  { width: 800, height: 600 },
  { width: 805, height: 603 },
  { width: 1000, height: 400 },
  { width: 250, height: 150 },
]

test.describe('Lineal', () => {
  for (const { width, height } of sizes) {
    test(`Beschriftung bleibt bei ${width}×${height} cm innerhalb des Gartens (#35, #36)`, async ({ page, seedState }) => {
      await seedState({ garden: { width, height } })
      await page.goto('/')
      const plan = (await gardenPlan(page).boundingBox())!
      const labels = page.getByRole('group', { name: 'Lineal' }).getByText(/^\d+$/)

      // Ecke einmal 0, dann alle 100 cm oben und links
      await expect(labels).toHaveCount(1 + Math.floor(width / 100) + Math.floor(height / 100))
      await expect(page.getByRole('group', { name: 'Lineal' }).getByText('0', { exact: true })).toHaveCount(1)

      for (const label of await labels.all()) {
        const box = (await label.boundingBox())!
        const text = await label.textContent()
        expect(isInside(box, plan), `„${text}“ ${fmt(box)} ragt aus dem Garten ${fmt(plan)}`).toBe(true)
      }
    })
  }
})

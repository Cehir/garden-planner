import { expect, test } from './fixtures'
import { fmt, isInside, overlaps } from './geometry'
import type { Page } from '@playwright/test'

function viewportBox(page: Page) {
  const { width, height } = page.viewportSize()!
  return { x: 0, y: 0, width, height }
}

// Der absolut positionierte ✕-Knopf darf keinen der Reiter verdecken
async function expectCloseClearOfTabs(page: Page, tabs: string[]) {
  const closeBox = (await page.getByRole('button', { name: 'Seitenleiste schließen' }).boundingBox())!
  for (const tab of tabs) {
    const tabBox = (await page.getByRole('button', { name: tab, exact: true }).boundingBox())!
    expect(overlaps(closeBox, tabBox), `✕ ${fmt(closeBox)} verdeckt den Reiter „${tab}“ ${fmt(tabBox)}`).toBe(false)
  }
}

test.describe('Mobile Seitenleiste (#28)', () => {
  test('Pflanzen-Overlay zeigt die Bibliothek, scrollbar und neben dem Schließen-Knopf', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '🌿 Pflanzen' }).click()

    const close = page.getByRole('button', { name: 'Seitenleiste schließen' })
    const firstPlant = page.getByRole('button', { name: 'Tomate — Platzieren' })
    await expect(close).toBeVisible()
    await expect(firstPlant).toBeVisible()
    const plantBox = (await firstPlant.boundingBox())!
    expect(isInside(plantBox, viewportBox(page)), `Tomate ${fmt(plantBox)} außerhalb des Bildschirms`).toBe(true)

    await expectCloseClearOfTabs(page, ['Pflanzen', 'Samenbank'])

    // Die Liste ist länger als der Bildschirm: der letzte Eintrag ist per Scrollen erreichbar
    const lastPlant = page.getByRole('button', { name: /— Platzieren$/ }).last()
    await lastPlant.scrollIntoViewIfNeeded()
    await expect(lastPlant).toBeInViewport()

    await close.click()
    await expect(firstPlant).toBeHidden()
  })

  test('Details-Overlay zeigt die Gartendaten neben dem Schließen-Knopf', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '📋 Details' }).click()

    const close = page.getByRole('button', { name: 'Seitenleiste schließen' })
    const name = page.getByRole('textbox', { name: 'Name' })
    await expect(page.getByRole('heading', { name: 'Garten' })).toBeVisible()
    await expect(name).toHaveValue('Mein Garten')
    const nameBox = (await name.boundingBox())!
    expect(isInside(nameBox, viewportBox(page)), `Name-Feld ${fmt(nameBox)} außerhalb des Bildschirms`).toBe(true)

    await expectCloseClearOfTabs(page, ['🏡 Garten', '📅 Tagebuch'])

    await close.click()
    await expect(name).toBeHidden()
  })

  test('Klick auf den Hintergrund schließt das Overlay', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '🌿 Pflanzen' }).click()
    await expect(page.getByRole('button', { name: 'Tomate — Platzieren' })).toBeVisible()

    // Unten links liegt der Hintergrund, nicht die Seitenleiste
    const { height } = page.viewportSize()!
    await page.mouse.click(5, height - 5)
    await expect(page.getByRole('button', { name: 'Tomate — Platzieren' })).toBeHidden()
  })
})

import type { Locator, Page } from '@playwright/test'
import type { AppState, Point } from '../src/types'
import { STORAGE_KEY } from '../src/persistence'

// Locator für die benannten Elemente des Editors (siehe AGENTS.md, E2E conventions)
export const gardenPlan = (page: Page) => page.getByRole('group', { name: 'Gartenplan' })
export const bedGroup = (page: Page, bed: string) => page.getByRole('group', { name: `Beet: ${bed}` })
export const plantGroup = (page: Page, plant: string, bed: string) =>
  page.getByRole('group', { name: `${plant} in ${bed}` })

// Bildschirm-Pixel je Zentimeter, aus Plan-Breite (px) und viewBox-Breite (cm)
async function pxPerCm(page: Page): Promise<number> {
  const plan = gardenPlan(page)
  const box = await plan.boundingBox()
  const viewBox = await plan.getAttribute('viewBox')
  if (!box || !viewBox) throw new Error('Gartenplan nicht sichtbar')
  return box.width / Number(viewBox.split(' ')[2])
}

/** Gartenkoordinate (cm) → Bildschirmkoordinate (px) */
export async function toScreen(page: Page, { x, y }: Point): Promise<Point> {
  const box = await gardenPlan(page).boundingBox()
  if (!box) throw new Error('Gartenplan nicht sichtbar')
  const scale = await pxPerCm(page)
  return { x: box.x + x * scale, y: box.y + y * scale }
}

/** Mittelpunkt eines Elements in Bildschirmkoordinaten */
export async function centerOf(locator: Locator): Promise<Point> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element nicht sichtbar')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Klick an eine Gartenkoordinate (cm) */
export async function clickAt(page: Page, point: Point): Promise<void> {
  const p = await toScreen(page, point)
  await page.mouse.click(p.x, p.y)
}

/** Zieht von einem Bildschirmpunkt aus um (dx, dy) Zentimeter, in mehreren Schritten */
export async function dragBy(page: Page, from: Point, dx: number, dy: number): Promise<void> {
  const scale = await pxPerCm(page)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx * scale, from.y + dy * scale, { steps: 5 })
  await page.mouse.up()
}

/** Der von der App gespeicherte Zustand */
export async function savedState(page: Page): Promise<AppState> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY)
}

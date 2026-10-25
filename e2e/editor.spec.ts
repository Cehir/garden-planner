import { expect, test } from './fixtures'
import { bedGroup, centerOf, clickAt, dragBy, plantGroup, savedState, toScreen } from './editor'
import type { Bed, PlacedPlant } from '../src/types'

const bed: Bed = { id: 'b1', name: 'Hochbeet', x: 200, y: 200, w: 200, h: 120, color: '#8bc34a', notes: '' }
const year = new Date().getFullYear()
// Tomate in der Beetmitte, Durchmesser 60 cm
const tomato: PlacedPlant = { id: 'p1', bedId: 'b1', plantId: 'tomate', x: 0.5, y: 0.5, size: 60, plantedYear: year }

test.describe('Editor: Beete', () => {
  test('zeichnet ein Beet mit dem Beet-Werkzeug', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Beet zeichnen' }).click()

    const start = await toScreen(page, { x: 100, y: 100 })
    await dragBy(page, start, 200, 120)

    await expect(bedGroup(page, 'Beet 1')).toHaveAttribute('aria-current', 'true')
    expect((await savedState(page)).beds).toMatchObject([{ name: 'Beet 1', x: 100, y: 100, w: 200, h: 120 }])
  })

  test('verschiebt ein Beet per Ziehen', async ({ page, seedState }) => {
    await seedState({ beds: [bed] })
    await page.goto('/')

    await dragBy(page, await toScreen(page, { x: 250, y: 220 }), 100, 50)

    expect((await savedState(page)).beds[0]).toMatchObject({ x: 300, y: 250, w: 200, h: 120 })
  })

  // Ziehen nach außen um 40 cm (waagrecht) bzw. 30 cm (senkrecht)
  const resizes = [
    { handle: 'Nordwest', dx: -40, dy: -30, expected: { x: 160, y: 170, w: 240, h: 150 } },
    { handle: 'Nord', dx: 0, dy: -30, expected: { x: 200, y: 170, w: 200, h: 150 } },
    { handle: 'Nordost', dx: 40, dy: -30, expected: { x: 200, y: 170, w: 240, h: 150 } },
    { handle: 'Ost', dx: 40, dy: 0, expected: { x: 200, y: 200, w: 240, h: 120 } },
    { handle: 'Südost', dx: 40, dy: 30, expected: { x: 200, y: 200, w: 240, h: 150 } },
    { handle: 'Süd', dx: 0, dy: 30, expected: { x: 200, y: 200, w: 200, h: 150 } },
    { handle: 'Südwest', dx: -40, dy: 30, expected: { x: 160, y: 200, w: 240, h: 150 } },
    { handle: 'West', dx: -40, dy: 0, expected: { x: 160, y: 200, w: 240, h: 120 } },
  ]
  for (const { handle, dx, dy, expected } of resizes) {
    test(`skaliert ein Beet am Anfasser ${handle}`, async ({ page, seedState }) => {
      await seedState({ beds: [bed] })
      await page.goto('/')
      await bedGroup(page, 'Hochbeet').click()

      await dragBy(page, await centerOf(page.getByRole('img', { name: `Beetgröße ändern: ${handle}`, exact: true })), dx, dy)

      expect((await savedState(page)).beds[0]).toMatchObject(expected)
    })
  }
})

test.describe('Editor: Pflanzen', () => {
  test('setzt die in der Bibliothek gewählte Pflanze ins Beet', async ({ page, seedState }) => {
    await seedState({ beds: [bed] })
    await page.goto('/')
    await page.getByRole('button', { name: 'Tomate — Platzieren' }).click()

    await clickAt(page, { x: 250, y: 250 })

    await expect(plantGroup(page, 'Tomate', 'Hochbeet')).toBeVisible()
    const [placed] = (await savedState(page)).placedPlants
    expect(placed).toMatchObject({ bedId: 'b1', plantId: 'tomate', size: 60, plantedYear: year })
    expect(placed.x).toBeCloseTo(0.25, 1)
    expect(placed.y).toBeCloseTo(0.42, 1)
  })

  test('verschiebt eine Pflanze innerhalb des Beets', async ({ page, seedState }) => {
    await seedState({ beds: [bed], placedPlants: [tomato] })
    await page.goto('/')

    await dragBy(page, await centerOf(plantGroup(page, 'Tomate', 'Hochbeet')), 50, 0)

    // Mitte von 300 auf 350 cm → relativ (350 − 200) / 200
    expect((await savedState(page)).placedPlants[0]).toMatchObject({ x: 0.75, y: 0.5, size: 60 })
    await expect(plantGroup(page, 'Tomate', 'Hochbeet')).toHaveAttribute('aria-current', 'true')
  })

  test('skaliert eine Pflanze am Größen-Anfasser', async ({ page, seedState }) => {
    await seedState({ beds: [bed], placedPlants: [tomato] })
    await page.goto('/')
    await clickAt(page, { x: 300, y: 260 })

    await dragBy(page, await centerOf(page.getByRole('img', { name: 'Pflanzengröße ändern' })), 20, 0)

    // Anfasser 30 cm → 50 cm vom Mittelpunkt entfernt: Durchmesser 100 cm
    expect((await savedState(page)).placedPlants[0]).toMatchObject({ size: 100 })
  })
})

test.describe('Editor: Ansichten', () => {
  test('zeigt den Schatten nach Norden und warnt bei beschatteter Pflanze', async ({ page, seedState }) => {
    // Chili (40 cm, braucht volle Sonne) steht 80 cm nördlich der Tomate (70 cm hoch)
    await seedState({
      beds: [{ ...bed, h: 200 }],
      placedPlants: [
        { ...tomato, y: 0.8 },
        { ...tomato, id: 'p2', plantId: 'chili', y: 0.4, size: 40 },
      ],
    })
    await page.goto('/')
    const chili = plantGroup(page, 'Chili', 'Hochbeet')

    const shadow = await page.getByRole('img', { name: 'Schatten: Tomate' }).boundingBox()
    const tomatoBox = await plantGroup(page, 'Tomate', 'Hochbeet').boundingBox()
    expect(shadow!.y).toBeLessThan(tomatoBox!.y)
    await expect(chili.getByRole('img', { name: 'Schattenkonflikt' })).toBeVisible()

    // Aus dem Schatten heraus nach Osten ziehen: Warnung verschwindet
    await dragBy(page, await centerOf(chili), 80, 0)
    await expect(chili.getByRole('img', { name: 'Schattenkonflikt' })).toHaveCount(0)
  })

  test('blendet die Pflanzjahre für die Fruchtfolge ein und aus', async ({ page, seedState }) => {
    await seedState({ beds: [bed], placedPlants: [tomato] })
    await page.goto('/')
    const plant = plantGroup(page, 'Tomate', 'Hochbeet')
    const toggle = page.getByRole('button', { name: /Fruchtfolge/ })

    await expect(plant.getByText(String(year))).toHaveCount(0)
    await toggle.click()
    await expect(plant.getByText(String(year))).toBeVisible()
    await toggle.click()
    await expect(plant.getByText(String(year))).toHaveCount(0)
  })

  test('hebt Pflanzen der gewählten Saison hervor und blendet die übrigen ab', async ({ page, seedState }) => {
    // Pflanzung: Tomate Mai–Juni (Sommer), Knoblauch September–November (nicht Sommer)
    await seedState({
      beds: [bed],
      placedPlants: [
        { ...tomato, x: 0.25 },
        { ...tomato, id: 'p2', plantId: 'knoblauch', x: 0.75, size: 30 },
      ],
    })
    await page.goto('/')
    const tomatoGroup = plantGroup(page, 'Tomate', 'Hochbeet')
    const garlic = plantGroup(page, 'Knoblauch', 'Hochbeet')
    const before = await tomatoGroup.boundingBox()

    await page.getByRole('combobox', { name: 'Saison-Filter für den Plan' }).selectOption({ label: 'Sommer' })

    await expect(garlic).toHaveCSS('opacity', '0.3')
    await expect(tomatoGroup).toHaveCSS('opacity', '1')
    // Gestrichelter Ring um die Tomate macht ihre Gruppe größer
    await expect.poll(async () => (await tomatoGroup.boundingBox())!.width).toBeGreaterThan(before!.width)
  })
})

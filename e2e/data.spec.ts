import { readFile } from 'node:fs/promises'
import { currentYear as year, expect, sampleBed as bed, sampleTomato as tomato, test } from './fixtures'
import { bedGroup, plantGroup, savedState } from './editor'

test.describe('Samenbank', () => {
  test('legt Saatgut an und nimmt es per Rückgängig/Wiederholen zurück', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Samenbank', exact: true }).click()
    await page.getByRole('button', { name: /Saatgut hinzufügen/ }).click()

    await page.getByRole('combobox', { name: 'Pflanze', exact: true }).selectOption('tomate')
    await page.getByRole('textbox', { name: 'Sorte / Name' }).fill('Ochsenherz')
    await page.getByRole('textbox', { name: 'Hersteller' }).fill('Quedlinburg')
    await page.getByLabel('Haltbarkeitsdatum').fill('2030-12-31')
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()

    await expect(page.getByText('Ochsenherz')).toBeVisible()
    expect((await savedState(page)).seeds).toMatchObject([
      { plantId: 'tomate', name: 'Ochsenherz', producer: 'Quedlinburg', expires: '2030-12-31' },
    ])

    await page.getByRole('button', { name: 'Rückgängig' }).click()
    await expect(page.getByText('Ochsenherz')).toHaveCount(0)
    await expect(page.getByText('Kein Saatgut gefunden.')).toBeVisible()
    expect((await savedState(page)).seeds).toEqual([])

    await page.getByRole('button', { name: 'Wiederholen' }).click()
    await expect(page.getByText('Ochsenherz')).toBeVisible()
    expect((await savedState(page)).seeds).toHaveLength(1)
  })
})

test.describe('Export, Reset und Import', () => {
  test.beforeEach(async ({ page, seedState }) => {
    await seedState({ garden: { name: 'Testgarten' }, beds: [bed], placedPlants: [tomato] })
    await page.goto('/')
  })

  test('stellt einen exportierten Plan nach dem Zurücksetzen per Import wieder her', async ({ page }) => {
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export/ }).click()
    const download = await downloading
    expect(download.suggestedFilename()).toBe('testgarten.json')
    const exported = JSON.parse(await readFile(await download.path(), 'utf8'))
    expect(exported).toEqual(await savedState(page))

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Reset/ }).click()
    await expect(bedGroup(page, 'Hochbeet')).toHaveCount(0)
    expect((await savedState(page)).garden.name).toBe('Mein Garten')

    await page.getByLabel(/Import/).setInputFiles(await download.path())
    await expect(bedGroup(page, 'Hochbeet')).toBeVisible()
    await expect(plantGroup(page, 'Tomate', 'Hochbeet')).toBeVisible()
    expect(await savedState(page)).toEqual(exported)
  })

  test('Abbrechen der Reset-Rückfrage lässt den Plan unverändert', async ({ page }) => {
    page.once('dialog', (dialog) => dialog.dismiss())
    await page.getByRole('button', { name: /Reset/ }).click()

    await expect(bedGroup(page, 'Hochbeet')).toBeVisible()
    expect((await savedState(page)).garden.name).toBe('Testgarten')
  })
})

test.describe('Drucken', () => {
  test('öffnet ein Druckfenster mit Plan und Legende', async ({ page, seedState }) => {
    await seedState({ garden: { name: 'Testgarten' }, beds: [bed], placedPlants: [tomato] })
    // Echtes print() endet in Headless-Chromium sofort mit afterprint, worauf die App das
    // Fenster schließt – mitten in den Assertions. Der Stub merkt sich nur den Aufruf.
    await page.context().addInitScript(() => {
      window.print = () => document.documentElement.setAttribute('data-e2e-printed', '')
    })
    await page.goto('/')

    const opening = page.waitForEvent('popup')
    await page.getByRole('button', { name: /Drucken/ }).click()
    const popup = await opening

    await expect(popup).toHaveTitle(`Testgarten – Gartenplan ${year}`)
    await expect(popup.getByRole('heading', { name: 'Testgarten', level: 1 })).toBeVisible()
    await expect(popup.locator('svg')).toBeVisible()
    await expect(popup.getByRole('heading', { name: 'Legende' })).toBeVisible()
    await expect(popup.getByRole('listitem').filter({ hasText: 'Tomate' })).toBeVisible()
    await expect(popup.locator('html')).toHaveAttribute('data-e2e-printed')
  })
})

import { describe, expect, it } from 'vitest'
import { canDoNow, formatRange, inRange, phaseMatchesSeason } from './seasons'
import type { Plant } from './types'

const currentMonth = new Date().getMonth() + 1
const otherMonth = (currentMonth % 12) + 1 // garantiert ≠ aktueller Monat

const spinat: Plant = {
  id: 'spinat',
  name: 'Spinat',
  emoji: '🌿',
  color: '#3f7d43',
  spacing: 20,
  height: 25,
  light: 'shade',
  soil: 'humus',
  sow: [3, 7],
  plant: [3, 7],
  harvest: [4, 6],
}

const tomate: Plant = {
  id: 'tomate',
  name: 'Tomate',
  emoji: '🍅',
  color: '#e0534b',
  spacing: 60,
  height: 70,
  light: 'full',
  soil: 'humus',
  sow: [2, 4],
  plant: [5, 6],
  harvest: [7, 9],
}

// Jahreswechsel: Nov–Feb
const tulpe: Plant = {
  id: 'tulpe',
  name: 'Tulpe',
  emoji: '🌷',
  color: '#d0527a',
  spacing: 12,
  height: 30,
  light: 'full',
  soil: 'sand',
  sow: [11, 2],
  plant: [11, 2],
  harvest: [12, 3],
}

describe('inRange', () => {
  it('erkennt Monate innerhalb eines Normalbereichs', () => {
    expect(inRange(4, [3, 5])).toBe(true)
    expect(inRange(3, [3, 5])).toBe(true)
    expect(inRange(5, [3, 5])).toBe(true)
    expect(inRange(2, [3, 5])).toBe(false)
    expect(inRange(6, [3, 5])).toBe(false)
  })

  it('unterstützt Einzelfenster (a === b)', () => {
    expect(inRange(1, [1, 1])).toBe(true)
    expect(inRange(2, [1, 1])).toBe(false)
  })

  it('unterstützt Jahreswechsel (start > end)', () => {
    expect(inRange(11, [11, 2])).toBe(true)
    expect(inRange(12, [11, 2])).toBe(true)
    expect(inRange(1, [11, 2])).toBe(true)
    expect(inRange(2, [11, 2])).toBe(true)
    expect(inRange(3, [11, 2])).toBe(false)
    expect(inRange(10, [11, 2])).toBe(false)
  })

  it('deckt [1,12] ganzes Jahr ab', () => {
    for (let m = 1; m <= 12; m++) expect(inRange(m, [1, 12])).toBe(true)
  })
})

describe('formatRange', () => {
  it('formatiert Bereich', () => {
    expect(formatRange([3, 6])).toBe('Mär–Jun')
  })

  it('formatiert Einzelmonat', () => {
    expect(formatRange([5, 5])).toBe('Mai')
  })
})

describe('phaseMatchesSeason', () => {
  it('gibt bei Saison "all" immer true zurück', () => {
    expect(phaseMatchesSeason(tomate, 'harvest', 'all')).toBe(true)
    expect(phaseMatchesSeason(spinat, 'sow', 'all')).toBe(true)
  })

  it('Frühling: Spinat-Ernte (Apr–Jun) trifft Mai', () => {
    expect(phaseMatchesSeason(spinat, 'harvest', 'spring')).toBe(true)
  })

  it('Frühling: Tomaten-Ernte (Jul–Sep) trifft nicht', () => {
    expect(phaseMatchesSeason(tomate, 'harvest', 'spring')).toBe(false)
  })

  it('Frühling: Tomaten-Aussaat (Feb–Apr) trifft Mär/Apr', () => {
    expect(phaseMatchesSeason(tomate, 'sow', 'spring')).toBe(true)
  })

  it('Sommer: Spinat-Ernte (Apr–Jun) trifft Jun', () => {
    expect(phaseMatchesSeason(spinat, 'harvest', 'summer')).toBe(true)
  })

  it('Herbst: Tomaten-Ernte (Jul–Sep) trifft Sep', () => {
    expect(phaseMatchesSeason(tomate, 'harvest', 'autumn')).toBe(true)
  })

  it('Winter: Spinat-Ernte (Apr–Jun) trifft nicht', () => {
    expect(phaseMatchesSeason(spinat, 'harvest', 'winter')).toBe(false)
  })

  it('Winter: Jahreswechsel-Ernte (Dez–Mär) trifft Dez/Jan/Feb', () => {
    expect(phaseMatchesSeason(tulpe, 'harvest', 'winter')).toBe(true)
  })

  it('Jahreswechsel-Ernte (Dez–Mär) trifft auch Frühling (Mär)', () => {
    expect(phaseMatchesSeason(tulpe, 'harvest', 'spring')).toBe(true)
  })

  it('Jahreswechsel-Ernte (Dez–Mär) trifft nicht Sommer', () => {
    expect(phaseMatchesSeason(tulpe, 'harvest', 'summer')).toBe(false)
  })

  it('Saison "now" = aktueller Monat', () => {
    expect(phaseMatchesSeason({ ...spinat, sow: [currentMonth, currentMonth] }, 'sow', 'now')).toBe(true)
    expect(phaseMatchesSeason({ ...spinat, sow: [otherMonth, otherMonth] }, 'sow', 'now')).toBe(false)
  })
})

describe('canDoNow', () => {
  it('true, wenn Aussaat im Monat liegt', () => {
    const p: Plant = { ...tomate, sow: [currentMonth, currentMonth] }
    expect(canDoNow(p, currentMonth)).toBe(true)
  })

  it('true, wenn Pflanzung im Monat liegt', () => {
    const p: Plant = { ...tomate, plant: [currentMonth, currentMonth] }
    expect(canDoNow(p, currentMonth)).toBe(true)
  })

  it('false, wenn nur Ernte im Monat liegt (kein Aussaat/Pflanz)', () => {
    const p: Plant = {
      ...tomate,
      sow: [otherMonth, otherMonth],
      plant: [otherMonth, otherMonth],
      harvest: [currentMonth, currentMonth],
    }
    expect(canDoNow(p, currentMonth)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import type { Seed } from './types'
import { daysUntil, expiryStatus, formatSeedDate, parseSeedDate } from './seeds'

function seed(expires: string): Seed {
  return {
    id: 's1',
    plantId: 'p1',
    name: 'Test',
    producer: '',
    filled: '2026-01-01',
    expires,
  }
}

describe('expiryStatus', () => {
  it('markiert vergangenes Datum als abgelaufen', () => {
    expect(expiryStatus(seed('2026-01-01'), new Date(2026, 2, 31))).toBe('expired')
  })

  it('behandelt den Haltbarkeitstag selbst als gültig, aber bald ablaufend', () => {
    expect(expiryStatus(seed('2026-03-31'), new Date(2026, 2, 31))).toBe('soon')
  })

  it('markiert <= 30 Tage als bald ablaufend', () => {
    expect(expiryStatus(seed('2026-04-30'), new Date(2026, 2, 31))).toBe('soon')
    expect(expiryStatus(seed('2026-04-01'), new Date(2026, 2, 31))).toBe('soon')
  })

  it('markiert über 30 Tage als haltbar', () => {
    expect(expiryStatus(seed('2026-05-01'), new Date(2026, 2, 31))).toBe('ok')
    expect(expiryStatus(seed('2027-01-01'), new Date(2026, 2, 31))).toBe('ok')
  })

  it('behandelt fehlendes/unlesbares Datum als haltbar', () => {
    expect(expiryStatus(seed(''), new Date(2026, 2, 31))).toBe('ok')
    expect(expiryStatus(seed('kein-datum'), new Date(2026, 2, 31))).toBe('ok')
  })
})

describe('daysUntil', () => {
  it('zählt Tage bis zum Ablauf', () => {
    expect(daysUntil(seed('2026-04-10'), new Date(2026, 2, 31))).toBe(10)
  })

  it('liefert null bei vergangenem/fehlendem Datum', () => {
    expect(daysUntil(seed('2026-01-01'), new Date(2026, 2, 31))).toBeNull()
    expect(daysUntil(seed(''), new Date(2026, 2, 31))).toBeNull()
  })
})

describe('date helpers', () => {
  it('parst gültige ISO-Daten', () => {
    const d = parseSeedDate('2026-12-31')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(11)
    expect(d?.getDate()).toBe(31)
  })

  it('weist ungültige Daten zurück (z.B. 31.02.)', () => {
    expect(parseSeedDate('2026-02-31')).toBeNull()
    expect(parseSeedDate('abc')).toBeNull()
  })

  it('formatiert ANSI-Datum für de-DE-Anzeige', () => {
    expect(formatSeedDate('2026-12-31')).toBe('31.12.2026')
  })
})
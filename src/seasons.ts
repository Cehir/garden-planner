import type { MonthRange, Phase, Plant, Season } from './types'

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
] as const

export const SEASON_MONTHS: Record<Exclude<Season, 'all' | 'now'>, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
}

export const SEASON_LABELS: Record<Season, string> = {
  all: 'Alle',
  spring: 'Frühling',
  summer: 'Sommer',
  autumn: 'Herbst',
  winter: 'Winter',
  now: 'Dieser Monat',
}

export const PHASE_LABELS: Record<Phase, string> = {
  sow: 'Aussaat',
  plant: 'Pflanzung',
  harvest: 'Ernte',
}

export function currentMonth(): number {
  return new Date().getMonth() + 1
}

export function inRange(month: number, range: MonthRange): boolean {
  const [a, b] = range
  if (a <= b) return month >= a && month <= b
  return month >= a || month <= b // wraps over year, e.g. Nov–Feb
}

export function formatRange(range: MonthRange): string {
  const [a, b] = range
  if (a === b) return MONTHS_SHORT[a - 1]
  return `${MONTHS_SHORT[a - 1]}–${MONTHS_SHORT[b - 1]}`
}

/** Can the crop be sown or planted in `month`? Used for the "jetzt pflanzbar" filter. */
export function canDoNow(plant: Plant, month: number): boolean {
  return inRange(month, plant.sow) || inRange(month, plant.plant)
}

/** Does the plant's `phase` window fall in `season`? */
export function phaseMatchesSeason(plant: Plant, phase: Phase, season: Season): boolean {
  if (season === 'all') return true
  const months = season === 'now' ? [currentMonth()] : SEASON_MONTHS[season]
  return months.some((m) => inRange(m, plant[phase]))
}

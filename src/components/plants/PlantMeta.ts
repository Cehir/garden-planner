import type { LightRequirement, SoilType } from '../../types'
import { MONTHS_SHORT } from '../../seasons'

export const LIGHT_ICONS: Record<LightRequirement, string> = {
  full: '☀️',
  partial: '⛅',
  shade: '☁️',
}

export const SOIL_ICONS: Record<SoilType, string> = {
  humus: '🍂',
  sand: '🏖️',
  loam: '🟫',
  clay: '🟤',
  normal: '🌱',
}

export const MONTH_OPTIONS = MONTHS_SHORT.map((label, i) => ({ value: i + 1, label }))

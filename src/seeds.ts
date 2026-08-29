import type { Seed } from './types'

export type ExpiryStatus = 'expired' | 'soon' | 'ok'

export const EXPIRY_SOON_DAYS = 30

export function expiryStatus(seed: Seed, today: Date = new Date()): ExpiryStatus {
  if (!seed.expires) return 'ok'
  const expires = parseSeedDate(seed.expires)
  if (!expires) return 'ok'
  const now = startOfDay(today)
  if (expires < now) return 'expired'
  const daysLeft = Math.round((expires.getTime() - now.getTime()) / 86_400_000)
  return daysLeft <= EXPIRY_SOON_DAYS ? 'soon' : 'ok'
}

export function daysUntil(seed: Seed, today: Date = new Date()): number | null {
  const expires = parseSeedDate(seed.expires)
  if (!expires) return null
  const now = startOfDay(today)
  if (expires < now) return null
  return Math.round((expires.getTime() - now.getTime()) / 86_400_000)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function parseSeedDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null
  }
  return date
}

export function formatSeedDate(value: string): string {
  const date = parseSeedDate(value)
  if (!date) return value || '–'
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const EXPIRY_BADGES: Record<ExpiryStatus, string> = {
  expired: '⚠️ abgelaufen',
  soon: '⏳ läuft bald ab',
  ok: '✓ haltbar',
}
import type { AppState, Garden, MonthRange } from './types'
import { DEFAULT_PLANTS } from './plants'

const STORAGE_KEY = 'gartenplaner-state-v1'

const DEFAULT_GARDEN: Garden = { name: 'Mein Garten', width: 800, height: 600 }

export function createDefaultState(): AppState {
  return {
    garden: { ...DEFAULT_GARDEN },
    beds: [],
    plants: DEFAULT_PLANTS,
    placedPlants: [],
    seeds: [],
    diary: [],
  }
}

// Ältere Exporte speicherten einen einzelnen Bereich ([3, 6]) statt einer Liste ([[3, 6]])
type LegacyRanges = MonthRange | MonthRange[]

function isRangeList(value: LegacyRanges): value is MonthRange[] {
  return Array.isArray(value[0])
}

function toRanges(value: LegacyRanges | undefined): MonthRange[] | undefined {
  if (value == null) return undefined
  return isRangeList(value) ? value : [value]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// normalizeState prüft und repariert jedes Feld einzeln, daher genügt hier „ist ein Objekt“
function isStateLike(value: unknown): value is Partial<AppState> {
  return isRecord(value)
}

// Beschädigte Sammlungen (kein Array) und Einträge, die keine Objekte sind (z. B. null),
// werden verworfen statt die App abstürzen zu lassen
function arrayOr<T>(value: T[] | undefined, fallback: T[]): T[] {
  return Array.isArray(value) ? value.filter((item) => isRecord(item)) : fallback
}

function positiveOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

// Fehlende oder ungültige Gartenmaße würden die Editor-viewBox auf NaN setzen
function normalizeGarden(value: unknown): Garden {
  const g = isRecord(value) ? value : {}
  return {
    name: typeof g.name === 'string' ? g.name : DEFAULT_GARDEN.name,
    width: positiveOr(g.width, DEFAULT_GARDEN.width),
    height: positiveOr(g.height, DEFAULT_GARDEN.height),
  }
}

export function normalizeState(raw: Partial<AppState>): AppState {
  return {
    ...raw,
    garden: normalizeGarden(raw.garden),
    beds: arrayOr(raw.beds, []),
    seeds: arrayOr(raw.seeds, []),
    plants: arrayOr(raw.plants, DEFAULT_PLANTS).map((p) => ({
      ...p,
      spacing: p.spacing ?? 25,
      height: p.height ?? 25,
      light: p.light ?? 'full',
      soil: p.soil ?? 'normal',
      family: p.family ?? 'andere',
      sow: toRanges(p.sow) ?? [[3, 6]],
      plant: toRanges(p.plant) ?? [[3, 6]],
      harvest: toRanges(p.harvest) ?? [[6, 9]],
    })),
    placedPlants: arrayOr(raw.placedPlants, []).map((p) => ({
      ...p,
      plantedYear: Number.isFinite(p.plantedYear) ? p.plantedYear : new Date().getFullYear(),
    })),
    diary: arrayOr(raw.diary, []).map((e) => ({
      ...e,
      targets: arrayOr(e.targets, []),
    })),
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      // Nur ablehnen, was normalizeState nicht reparieren kann – sonst überschreibt der
      // Standardzustand beim nächsten Speichern die Daten des Nutzers
      if (isStateLike(parsed)) {
        return normalizeState(parsed)
      }
    }
  } catch {
    // unlesbarer Zustand -> Standard verwenden
  }
  return createDefaultState()
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    // Speicher voll oder gesperrt (Quota, Privatmodus) -> App nicht abstürzen lassen
    console.warn('Gartenplaner: Zustand konnte nicht gespeichert werden', err)
  }
}

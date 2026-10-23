import type { AppState, MonthRange } from './types'
import { DEFAULT_PLANTS } from './plants'

const STORAGE_KEY = 'gartenplaner-state-v1'

export function createDefaultState(): AppState {
  return {
    garden: { name: 'Mein Garten', width: 800, height: 600 },
    beds: [],
    plants: DEFAULT_PLANTS,
    placedPlants: [],
    seeds: [],
    diary: [],
  }
}

function toRanges(value: MonthRange | MonthRange[] | undefined): MonthRange[] | undefined {
  if (value == null) return undefined
  if (Array.isArray(value[0])) return value as MonthRange[]
  return [value as MonthRange]
}

export function normalizeState(raw: Partial<AppState>): AppState {
  return {
    ...raw,
    garden: raw.garden ?? { name: 'Mein Garten', width: 800, height: 600 },
    beds: raw.beds ?? [],
    seeds: raw.seeds ?? [],
    plants: (raw.plants ?? []).map((p) => ({
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
    placedPlants: (raw.placedPlants ?? []).map((p) => ({
      ...p,
      plantedYear: Number.isFinite(p.plantedYear) ? (p.plantedYear as number) : new Date().getFullYear(),
    })),
    diary: (raw.diary ?? []).map((e) => ({
      ...e,
      targets: e.targets ?? [],
    })),
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (
        parsed &&
        parsed.garden &&
        Number.isFinite(parsed.garden.width) &&
        Number.isFinite(parsed.garden.height) &&
        Array.isArray(parsed.beds) &&
        Array.isArray(parsed.plants) &&
        Array.isArray(parsed.placedPlants)
      ) {
        return normalizeState(parsed)
      }
    }
  } catch {
    // unlesbarer Zustand -> Standard verwenden
  }
  return createDefaultState()
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

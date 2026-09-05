export interface Garden {
  name: string
  width: number
  height: number
}

export interface Bed {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  color: string
  notes: string
}

export type LightRequirement = 'full' | 'partial' | 'shade'

export const LIGHT_LABELS: Record<LightRequirement, string> = {
  full: 'Sonne',
  partial: 'Halbschatten',
  shade: 'Schatten',
}

export type SoilType = 'humus' | 'sand' | 'loam' | 'clay' | 'normal'

export const SOIL_LABELS: Record<SoilType, string> = {
  humus: 'Humus',
  sand: 'Sand',
  loam: 'Lehm',
  clay: 'Ton',
  normal: 'normaler Gartenboden',
}

export type MonthRange = [number, number]

export type PlantFamily =
  | 'nacht-schatten'
  | 'kuerbis'
  | 'kreuzbluetler'
  | 'knollengewaeche'
  | 'lauch'
  | 'lippenbluetler'
  | 'malven'
  | 'andere'

export const FAMILY_LABELS: Record<PlantFamily, string> = {
  'nacht-schatten': 'Nachtschattengewächse',
  kuerbis: 'Kürbisgewächse',
  kreuzbluetler: 'Kreuzblütler',
  knollengewaeche: 'Knollengewächse',
  lauch: 'Lauchgewächse',
  lippenbluetler: 'Lippenblütler',
  malven: 'Mallengewächse',
  andere: 'Sonstige',
}

export type Phase = 'sow' | 'plant' | 'harvest'

export type BedAction = 'water' | 'mulch' | 'fertilize'

export const BED_ACTION_LABELS: Record<BedAction, string> = {
  water: 'Gießen',
  mulch: 'Mulchen',
  fertilize: 'Düngen',
}

export const BED_ACTION_EMOJI: Record<BedAction, string> = {
  water: '💧',
  mulch: '🍂',
  fertilize: '🧪',
}

export type PlantAction = 'harvest' | 'pest' | 'remove'

export const PLANT_ACTION_LABELS: Record<PlantAction, string> = {
  harvest: 'Ernten',
  pest: 'Schädlinge',
  remove: 'Entfernen',
}

export const PLANT_ACTION_EMOJI: Record<PlantAction, string> = {
  harvest: '🧺',
  pest: '🐛',
  remove: '❌',
}

export type DiaryTarget =
  | { kind: 'bed'; bedId: string; action: BedAction }
  | { kind: 'plant'; placedPlantId: string; action: PlantAction }

export interface DiaryEntry {
  id: string
  date: string
  timestamp: number
  note: string
  targets: DiaryTarget[]
}

export type Season = 'all' | 'spring' | 'summer' | 'autumn' | 'winter' | 'now'

export interface Plant {
  id: string
  name: string
  emoji: string
  color: string
  spacing: number
  height: number
  light: LightRequirement
  soil: SoilType
  family: PlantFamily
  sow: MonthRange[]
  plant: MonthRange[]
  harvest: MonthRange[]
}

export interface PlacedPlant {
  id: string
  bedId: string
  plantId: string
  x: number
  y: number
  size: number
  plantedYear: number
}

export interface Seed {
  id: string
  plantId: string
  name: string
  producer: string
  filled: string
  expires: string
}

export type Tool = 'select' | 'bed' | 'plant'

export type Selected = { kind: 'bed'; id: string } | { kind: 'placed'; id: string }

export interface AppState {
  garden: Garden
  beds: Bed[]
  plants: Plant[]
  placedPlants: PlacedPlant[]
  seeds: Seed[]
  diary: DiaryEntry[]
}

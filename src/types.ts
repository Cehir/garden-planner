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

export interface Plant {
  id: string
  name: string
  emoji: string
  color: string
  spacing: number
}

export interface PlacedPlant {
  id: string
  bedId: string
  plantId: string
  x: number
  y: number
  size: number
}

export type Tool = 'select' | 'bed' | 'plant'

export type Selected = { kind: 'bed'; id: string } | { kind: 'placed'; id: string }

export interface AppState {
  garden: Garden
  beds: Bed[]
  plants: Plant[]
  placedPlants: PlacedPlant[]
}

import type { AppState, Bed, DiaryEntry, Garden, PlacedPlant, Plant, Seed } from './types'
import { normalizeState } from './persistence'

export type Action =
  | { type: 'setGarden'; patch: Partial<Garden> }
  | { type: 'addBed'; bed: Bed }
  | { type: 'updateBed'; id: string; patch: Partial<Bed> }
  | { type: 'removeBed'; id: string }
  | { type: 'addPlant'; plant: Plant }
  | { type: 'updatePlant'; id: string; patch: Partial<Plant> }
  | { type: 'removePlant'; id: string }
  | { type: 'addPlacedPlant'; plant: PlacedPlant }
  | { type: 'updatePlacedPlant'; id: string; patch: Partial<PlacedPlant> }
  | { type: 'removePlacedPlant'; id: string }
  | { type: 'addSeed'; seed: Seed }
  | { type: 'updateSeed'; id: string; patch: Partial<Seed> }
  | { type: 'removeSeed'; id: string }
  | { type: 'addDiaryEntry'; entry: DiaryEntry }
  | { type: 'removeDiaryEntry'; id: string }
  | { type: 'load'; state: AppState }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setGarden':
      return { ...state, garden: { ...state.garden, ...action.patch } }
    case 'addBed':
      return { ...state, beds: [...state.beds, action.bed] }
    case 'updateBed':
      return {
        ...state,
        beds: state.beds.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)),
      }
    case 'removeBed':
      return {
        ...state,
        beds: state.beds.filter((b) => b.id !== action.id),
        placedPlants: state.placedPlants.filter((p) => p.bedId !== action.id),
      }
    case 'addPlant':
      return { ...state, plants: [...state.plants, action.plant] }
    case 'updatePlant':
      return {
        ...state,
        plants: state.plants.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      }
    case 'removePlant':
      return {
        ...state,
        plants: state.plants.filter((p) => p.id !== action.id),
        seeds: state.seeds.filter((s) => s.plantId !== action.id),
      }
    case 'addPlacedPlant':
      return { ...state, placedPlants: [...state.placedPlants, action.plant] }
    case 'updatePlacedPlant':
      return {
        ...state,
        placedPlants: state.placedPlants.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p,
        ),
      }
    case 'removePlacedPlant':
      return { ...state, placedPlants: state.placedPlants.filter((p) => p.id !== action.id) }
    case 'addSeed':
      return { ...state, seeds: [...state.seeds, action.seed] }
    case 'updateSeed':
      return {
        ...state,
        seeds: state.seeds.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      }
    case 'removeSeed':
      return { ...state, seeds: state.seeds.filter((s) => s.id !== action.id) }
    case 'addDiaryEntry':
      return { ...state, diary: [...state.diary, action.entry] }
    case 'removeDiaryEntry':
      return { ...state, diary: state.diary.filter((e) => e.id !== action.id) }
    case 'load':
      return normalizeState(action.state)
  }
}

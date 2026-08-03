import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode, Dispatch } from 'react'
import type { AppState, Bed, Garden, PlacedPlant, Plant } from './types'
import { DEFAULT_PLANTS } from './plants'

const STORAGE_KEY = 'gartenplaner-state-v1'

export function createDefaultState(): AppState {
  return {
    garden: { name: 'Mein Garten', width: 800, height: 600 },
    beds: [],
    plants: DEFAULT_PLANTS,
    placedPlants: [],
  }
}

function loadState(): AppState {
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
        return {
          ...parsed,
          plants: parsed.plants.map((p) => ({
            ...p,
            spacing: p.spacing ?? 25,
            height: p.height ?? 25,
            light: p.light ?? 'full',
            soil: p.soil ?? 'normal',
          })),
        }
      }
    }
  } catch {
    // unlesbarer Zustand -> Standard verwenden
  }
  return createDefaultState()
}

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
  | { type: 'load'; state: AppState }

function reducer(state: AppState, action: Action): AppState {
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
      return { ...state, plants: state.plants.filter((p) => p.id !== action.id) }
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
    case 'load':
      return action.state
  }
}

interface StoreContextValue {
  state: AppState
  dispatch: Dispatch<Action>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode, Dispatch } from 'react'
import type { AppState, Bed, DiaryEntry, Garden, PlacedPlant, Plant, Seed } from './types'
import { createDefaultState as _createDefaultState, normalizeState as _normalizeState, loadState as _loadState, STORAGE_KEY as _STORAGE_KEY } from './persistence'

// Re-export persistence API for existing consumers
export { createDefaultState, normalizeState, loadState, saveState } from './persistence'

function loadState(): AppState {
  return _loadState()
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
      return _normalizeState(action.state)
  }
}

interface StoreContextValue {
  state: AppState
  dispatch: Dispatch<Action>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  beginTransaction: () => void
  commitTransaction: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export const MAX_HISTORY = 10

export interface HistoryState {
  present: AppState
  past: AppState[]
  future: AppState[]
  txnOpen: boolean
  txnBase: AppState | null
}

export type HistoryAction =
  | { type: 'mutate'; action: Action }
  | { type: 'begin' }
  | { type: 'commit' }
  | { type: 'undo' }
  | { type: 'redo' }

function createHistoryState(state: AppState): HistoryState {
  return { present: state, past: [], future: [], txnOpen: false, txnBase: null }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  if (Array.isArray(a)) {
    if (a.length !== (b as unknown[]).length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], (b as unknown[])[i])) return false
    }
    return true
  }
  if (typeof a === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
    }
    return true
  }
  return false
}

function sameState(a: AppState, b: AppState): boolean {
  return a === b || deepEqual(a, b)
}

export function historyReducer(hs: HistoryState, sa: HistoryAction): HistoryState {
  switch (sa.type) {
    case 'begin':
      return { ...hs, txnOpen: true, txnBase: hs.present }
    case 'commit': {
      if (!hs.txnOpen || !hs.txnBase) return hs
      const changed = !sameState(hs.txnBase, hs.present)
      return {
        present: hs.present,
        past: changed ? [...hs.past, hs.txnBase].slice(-MAX_HISTORY) : hs.past,
        future: changed ? [] : hs.future,
        txnOpen: false,
        txnBase: null,
      }
    }
    case 'undo':
      if (hs.past.length === 0) return hs
      return {
        present: hs.past[hs.past.length - 1],
        past: hs.past.slice(0, -1),
        future: [...hs.future, hs.present].slice(-MAX_HISTORY),
        txnOpen: false,
        txnBase: null,
      }
    case 'redo':
      if (hs.future.length === 0) return hs
      return {
        present: hs.future[hs.future.length - 1],
        past: [...hs.past, hs.present].slice(-MAX_HISTORY),
        future: hs.future.slice(0, -1),
        txnOpen: false,
        txnBase: null,
      }
    case 'mutate':
      if (sa.action.type === 'load') {
        return createHistoryState(_normalizeState(sa.action.state))
      }
      if (hs.txnOpen) {
        return { ...hs, present: reducer(hs.present, sa.action) }
      }
      return {
        present: reducer(hs.present, sa.action),
        past: [...hs.past, hs.present].slice(-MAX_HISTORY),
        future: [],
        txnOpen: false,
        txnBase: null,
      }
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [history, historyDispatch] = useReducer(
    historyReducer,
    undefined,
    (): HistoryState => createHistoryState(loadState()),
  )

  const dispatch = useCallback(
    (action: Action) => historyDispatch({ type: 'mutate', action }),
    [],
  )
  const undo = useCallback(() => historyDispatch({ type: 'undo' }), [])
  const redo = useCallback(() => historyDispatch({ type: 'redo' }), [])
  const beginTransaction = useCallback(() => historyDispatch({ type: 'begin' }), [])
  const commitTransaction = useCallback(() => historyDispatch({ type: 'commit' }), [])

  useEffect(() => {
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(history.present))
  }, [history.present])

  const value = useMemo<StoreContextValue>(
    () => ({
      state: history.present,
      dispatch,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      beginTransaction,
      commitTransaction,
    }),
    [history, dispatch, undo, redo, beginTransaction, commitTransaction],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return ctx
}

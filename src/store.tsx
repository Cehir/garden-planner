import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode, Dispatch } from 'react'
import type { AppState } from './types'
import { loadState, normalizeState, saveState } from './persistence'
import { reducer } from './reducer'
import type { Action } from './reducer'

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
        return createHistoryState(normalizeState(sa.action.state))
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
    saveState(history.present)
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

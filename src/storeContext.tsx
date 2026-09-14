import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode, Dispatch } from 'react'
import type { AppState } from './types'
import { createDefaultState as _createDefaultState, normalizeState as _normalizeState, loadState as _loadState, STORAGE_KEY as _STORAGE_KEY } from './persistence'
import { historyReducer as _historyReducer, createHistoryState as _createHistoryState, type HistoryState as _HistoryState } from './history'
import type { Action } from './reducer'

export interface StoreContextValue {
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

export { StoreContext }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [history, historyDispatch] = useReducer(
    _historyReducer,
    undefined,
    (): _HistoryState => _createHistoryState(_loadState()),
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

  const value = useMemo(
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

/** Lightweight hook — only the state slice. */
export function useStoreState(): AppState {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStoreState must be used within StoreProvider')
  }
  return ctx.state
}

/** Lightweight hook — only the dispatch function. */
export function useStoreDispatch(): Dispatch<Action> {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStoreDispatch must be used within StoreProvider')
  }
  return ctx.dispatch
}

/** Lightweight hook — only the history functions. */
export function useHistory(): {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  beginTransaction: () => void
  commitTransaction: () => void
} {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useHistory must be used within StoreProvider')
  }
  return {
    undo: ctx.undo,
    redo: ctx.redo,
    canUndo: ctx.canUndo,
    canRedo: ctx.canRedo,
    beginTransaction: ctx.beginTransaction,
    commitTransaction: ctx.commitTransaction,
  }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode, Dispatch } from 'react'
import type { AppState } from './types'
import { createDefaultState as _createDefaultState, normalizeState as _normalizeState, loadState as _loadState, STORAGE_KEY as _STORAGE_KEY } from './persistence'
import { historyReducer as _historyReducer, createHistoryState as _createHistoryState, MAX_HISTORY as _MAX_HISTORY, type HistoryState as _HistoryState, type HistoryAction as _HistoryAction } from './history'
import { reducer as _reducer, type Action as _Action } from './reducer'
import type { Action } from './reducer'

// Re-export persistence API for existing consumers
export { createDefaultState, normalizeState, loadState, saveState } from './persistence'
// Re-export history API for existing consumers
export { createHistoryState, historyReducer, MAX_HISTORY, type HistoryState, type HistoryAction } from './history'
// Re-export reducer API for existing consumers
export { reducer, type Action } from './reducer'

function loadState(): AppState {
  return _loadState()
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [history, historyDispatch] = useReducer(
    _historyReducer,
    undefined,
    (): _HistoryState => _createHistoryState(loadState()),
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

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return ctx
}

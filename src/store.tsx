import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode, Dispatch } from 'react'
import type { AppState } from './types'
import { loadState, saveState } from './persistence'
import type { Action } from './reducer'
import { createHistoryState, historyReducer } from './history'
import type { HistoryState } from './history'

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

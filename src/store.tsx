import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { loadState, saveState } from './persistence'
import type { Action } from './reducer'
import { createHistoryState, historyReducer } from './history'
import type { HistoryState } from './history'
import { DispatchContext, HistoryContext, StateContext } from './storeContext'
import type { HistoryControls } from './storeContext'

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

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0
  const historyControls = useMemo<HistoryControls>(
    () => ({ undo, redo, canUndo, canRedo, beginTransaction, commitTransaction }),
    [undo, redo, canUndo, canRedo, beginTransaction, commitTransaction],
  )

  return (
    <DispatchContext.Provider value={dispatch}>
      <HistoryContext.Provider value={historyControls}>
        <StateContext.Provider value={history.present}>{children}</StateContext.Provider>
      </HistoryContext.Provider>
    </DispatchContext.Provider>
  )
}

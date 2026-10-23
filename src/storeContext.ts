import { createContext, useContext, useMemo } from 'react'
import type { Context, Dispatch } from 'react'
import type { AppState } from './types'
import type { Action } from './reducer'

export interface HistoryControls {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  beginTransaction: () => void
  commitTransaction: () => void
}

export interface StoreContextValue extends HistoryControls {
  state: AppState
  dispatch: Dispatch<Action>
}

// Getrennte Contexts, damit z. B. reine dispatch-/History-Nutzer nicht bei jeder
// State-Änderung neu rendern.
export const StateContext = createContext<AppState | null>(null)
export const DispatchContext = createContext<Dispatch<Action> | null>(null)
export const HistoryContext = createContext<HistoryControls | null>(null)

function useRequiredContext<T>(context: Context<T | null>, hook: string): T {
  const value = useContext(context)
  if (value === null) {
    throw new Error(`${hook} must be used within StoreProvider`)
  }
  return value
}

/** Gesamter Store – nur dort verwenden, wo wirklich alles gebraucht wird (App). */
export function useStore(): StoreContextValue {
  const state = useRequiredContext(StateContext, 'useStore')
  const dispatch = useRequiredContext(DispatchContext, 'useStore')
  const history = useRequiredContext(HistoryContext, 'useStore')
  return useMemo(() => ({ ...history, state, dispatch }), [history, state, dispatch])
}

export function useStoreState(): AppState {
  return useRequiredContext(StateContext, 'useStoreState')
}

export function useStoreDispatch(): Dispatch<Action> {
  return useRequiredContext(DispatchContext, 'useStoreDispatch')
}

export function useHistory(): HistoryControls {
  return useRequiredContext(HistoryContext, 'useHistory')
}

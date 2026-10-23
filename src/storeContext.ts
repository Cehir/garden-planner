import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { AppState } from './types'
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

export type HistoryControls = Pick<
  StoreContextValue,
  'undo' | 'redo' | 'canUndo' | 'canRedo' | 'beginTransaction' | 'commitTransaction'
>

export const StoreContext = createContext<StoreContextValue | null>(null)

/** Gesamter Store – nur dort verwenden, wo wirklich alles gebraucht wird (App). */
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return ctx
}

export function useStoreState(): AppState {
  return useStore().state
}

export function useStoreDispatch(): Dispatch<Action> {
  return useStore().dispatch
}

export function useHistory(): HistoryControls {
  const { undo, redo, canUndo, canRedo, beginTransaction, commitTransaction } = useStore()
  return { undo, redo, canUndo, canRedo, beginTransaction, commitTransaction }
}

import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Dispatch } from 'react'
import { StoreProvider } from './store'
import { useHistory, useStoreDispatch, useStoreState } from './storeContext'
import type { HistoryControls } from './storeContext'
import type { Action } from './reducer'
import type { AppState } from './types'

describe('StoreProvider: getrennte Contexts', () => {
  beforeEach(() => localStorage.clear())

  it('rendert reine dispatch-/History-Nutzer nicht bei jeder State-Änderung neu', () => {
    const dispatches: Dispatch<Action>[] = []
    const historyValues: HistoryControls[] = []
    const states: AppState[] = []

    function DispatchOnly() {
      dispatches.push(useStoreDispatch())
      return null
    }
    function HistoryOnly() {
      historyValues.push(useHistory())
      return null
    }
    function StateOnly() {
      states.push(useStoreState())
      return null
    }

    render(
      <StoreProvider>
        <DispatchOnly />
        <HistoryOnly />
        <StateOnly />
      </StoreProvider>,
    )

    const dispatch = dispatches[0]
    // Erste Änderung: canUndo wechselt → History-Nutzer rendert einmal neu.
    act(() => dispatch({ type: 'setGarden', patch: { name: 'A' } }))
    expect(historyValues).toHaveLength(2)
    // Weitere Änderungen: canUndo/canRedo bleiben gleich.
    act(() => dispatch({ type: 'setGarden', patch: { name: 'B' } }))
    act(() => dispatch({ type: 'setGarden', patch: { name: 'C' } }))

    expect(dispatches).toHaveLength(1)
    expect(states).toHaveLength(4)
    expect(historyValues).toHaveLength(2)
  })

  it('liefert stabile History-Controls, solange canUndo/canRedo gleich bleiben', () => {
    const values: HistoryControls[] = []
    const dispatches: Dispatch<Action>[] = []

    function Probe() {
      useStoreState()
      dispatches.push(useStoreDispatch())
      values.push(useHistory())
      return null
    }

    render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    )
    const dispatch = dispatches[0]
    act(() => dispatch({ type: 'setGarden', patch: { name: 'A' } }))
    act(() => dispatch({ type: 'setGarden', patch: { name: 'B' } }))

    expect(values).toHaveLength(3)
    expect(values[0]).not.toBe(values[1])
    expect(values[1]).toBe(values[2])
  })
})

import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Dispatch } from 'react'
import { StoreProvider } from '../store'
import { useHistory, useStoreDispatch } from '../storeContext'
import type { HistoryControls } from '../storeContext'
import type { Action } from '../reducer'
import Editor from './Editor'

describe('Editor: Ziehgesten-Transaktion', () => {
  beforeEach(() => localStorage.clear())

  it('schließt die Transaktion bei verlorenem Pointer-Capture ohne pointerup', () => {
    const histories: HistoryControls[] = []
    const dispatches: Dispatch<Action>[] = []
    function Probe() {
      histories.push(useHistory())
      dispatches.push(useStoreDispatch())
      return null
    }

    const { container } = render(
      <StoreProvider>
        <Editor
          tool="bed"
          selected={null}
          onSelect={() => {}}
          placedPlant={null}
          zoom={1}
          season="all"
          phase="plant"
          showRotation={false}
          year={2026}
        />
        <Probe />
      </StoreProvider>,
    )
    const svg = container.querySelector('svg.editor-svg')!
    fireEvent.pointerDown(svg, { button: 0, pointerId: 1 })
    fireEvent.lostPointerCapture(svg, { pointerId: 1 })

    act(() =>
      dispatches[0]({
        type: 'addBed',
        bed: { id: 'b1', name: 'Beet', x: 0, y: 0, w: 50, h: 50, color: '#fff', notes: '' },
      }),
    )
    // Ohne geschlossene Transaktion würde addBed darin verschwinden und Undo ignoriert
    expect(histories[histories.length - 1].canUndo).toBe(true)
  })
})

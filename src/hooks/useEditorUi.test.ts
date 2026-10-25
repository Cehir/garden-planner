import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useEditorUi } from './useEditorUi'
import { DEFAULT_PLANTS } from '../plants'

const plant = DEFAULT_PLANTS[0]

describe('useEditorUi', () => {
  it('startet im Auswahl-Werkzeug mit dem aktuellen Jahr', () => {
    const { result } = renderHook(() => useEditorUi())
    expect(result.current.tool).toBe('select')
    expect(result.current.selected).toBeNull()
    expect(result.current.year).toBe(new Date().getFullYear())
  })

  it('aktiviert beim Auswählen einer Pflanze das Pflanz-Werkzeug', () => {
    const { result } = renderHook(() => useEditorUi())
    act(() => result.current.handlePick(plant))
    expect(result.current.tool).toBe('plant')
    expect(result.current.plantToPlace).toBe(plant)
  })

  it('verwirft die zu platzierende Pflanze beim Wechsel auf ein anderes Werkzeug', () => {
    const { result } = renderHook(() => useEditorUi())
    act(() => result.current.handlePick(plant))
    act(() => result.current.setToolSafe('plant'))
    expect(result.current.plantToPlace).toBe(plant)
    act(() => result.current.setToolSafe('bed'))
    expect(result.current.plantToPlace).toBeNull()
  })

  it('verwirft beim Jahreswechsel nur die Auswahl platzierter Pflanzen', () => {
    const { result } = renderHook(() => useEditorUi())
    act(() => result.current.setSelected({ kind: 'bed', id: 'b1' }))
    act(() => result.current.handleYear(2020))
    expect(result.current.selected).toEqual({ kind: 'bed', id: 'b1' })
    act(() => result.current.setSelected({ kind: 'placed', id: 'p1' }))
    act(() => result.current.handleYear(2021))
    expect(result.current.selected).toBeNull()
    expect(result.current.year).toBe(2021)
  })

  it('resetUi setzt Auswahl, Pflanze und Werkzeug zurück', () => {
    const { result } = renderHook(() => useEditorUi())
    act(() => result.current.handlePick(plant))
    act(() => result.current.setSelected({ kind: 'bed', id: 'b1' }))
    act(() => result.current.resetUi())
    expect(result.current.tool).toBe('select')
    expect(result.current.selected).toBeNull()
    expect(result.current.plantToPlace).toBeNull()
  })
})

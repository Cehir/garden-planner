import { describe, expect, it, vi } from 'vitest'
import { fireEvent, renderHook } from '@testing-library/react'
import { isTypingTarget, useKeyboardShortcuts } from './useKeyboardShortcuts'

function setup() {
  const handlers = {
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onDeleteSelected: vi.fn(),
    onEscape: vi.fn(),
    onSelectTool: vi.fn(),
    onFit: vi.fn(),
  }
  const hook = renderHook(() => useKeyboardShortcuts(handlers))
  return { handlers, ...hook }
}

describe('isTypingTarget', () => {
  it('erkennt Eingabefelder', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(document.createElement('select'))).toBe(true)
  })

  it('ignoriert andere Elemente und null', () => {
    expect(isTypingTarget(document.createElement('div'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe('useKeyboardShortcuts', () => {
  it('wählt Werkzeuge mit V, B und P (auch groß)', () => {
    const { handlers } = setup()
    fireEvent.keyDown(window, { key: 'v' })
    fireEvent.keyDown(window, { key: 'B' })
    fireEvent.keyDown(window, { key: 'p' })
    expect(handlers.onSelectTool.mock.calls).toEqual([['select'], ['bed'], ['plant']])
  })

  it('passt mit F ein und reagiert auf Esc', () => {
    const { handlers } = setup()
    fireEvent.keyDown(window, { key: 'f' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handlers.onFit).toHaveBeenCalledTimes(1)
    expect(handlers.onEscape).toHaveBeenCalledTimes(1)
  })

  it('macht mit Strg+Z rückgängig und stellt mit Strg+Umschalt+Z / Strg+Y wieder her', () => {
    const { handlers } = setup()
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true })
    fireEvent.keyDown(window, { key: 'y', metaKey: true })
    expect(handlers.onUndo).toHaveBeenCalledTimes(1)
    expect(handlers.onRedo).toHaveBeenCalledTimes(2)
  })

  it('löscht die Auswahl mit Entf und Rücktaste', () => {
    const { handlers } = setup()
    fireEvent.keyDown(window, { key: 'Delete' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(handlers.onDeleteSelected).toHaveBeenCalledTimes(2)
  })

  it('unterdrückt Entf und Undo, solange ein Eingabefeld fokussiert ist', () => {
    const { handlers } = setup()
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'Delete' })
    fireEvent.keyDown(input, { key: 'Backspace' })
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true })
    expect(handlers.onDeleteSelected).not.toHaveBeenCalled()
    expect(handlers.onUndo).not.toHaveBeenCalled()
    input.remove()
  })

  it('nutzt nach einem Re-Render die neuen Handler', () => {
    const { handlers } = setup()
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook((onFit: () => void) => useKeyboardShortcuts({ ...handlers, onFit }), {
      initialProps: first,
    })
    rerender(second)
    fireEvent.keyDown(window, { key: 'f' })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('entfernt den Listener beim Unmount', () => {
    const { handlers, unmount } = setup()
    unmount()
    fireEvent.keyDown(window, { key: 'f' })
    expect(handlers.onFit).not.toHaveBeenCalled()
  })
})

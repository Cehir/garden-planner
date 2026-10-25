import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Tool } from '../types'

export interface KeyboardShortcutHandlers {
  onUndo: () => void
  onRedo: () => void
  onDeleteSelected: () => void
  onEscape: () => void
  onSelectTool: (tool: Tool) => void
  onFit: () => void
}

const TOOL_KEYS: Record<string, Tool> = { v: 'select', b: 'bed', p: 'plant' }

/** Fokus liegt in einem Eingabefeld – dort sollen Entf/Rücktaste und Undo nativ wirken. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(
    el &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable),
  )
}

/** Globale Tastenkürzel: V/B/P Werkzeuge, F einpassen, Esc, Entf, Undo/Redo. */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  // Immer die aktuellen Handler nutzen, ohne den Listener bei jedem Render neu zu registrieren
  const handlersRef = useRef(handlers)
  useLayoutEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const h = handlersRef.current
      const typing = isTypingTarget(e.target)
      const isDelete = e.key === 'Delete' || e.key === 'Backspace'
      if (typing && isDelete) return
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        if (!typing) {
          e.preventDefault()
          if (e.shiftKey) h.onRedo()
          else h.onUndo()
        }
        return
      }
      if (mod && key === 'y') {
        if (!typing) {
          e.preventDefault()
          h.onRedo()
        }
        return
      }
      if (isDelete) h.onDeleteSelected()
      else if (e.key === 'Escape') h.onEscape()
      else if (Object.hasOwn(TOOL_KEYS, key)) h.onSelectTool(TOOL_KEYS[key])
      else if (key === 'f') h.onFit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

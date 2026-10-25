import type { Dispatch } from 'react'
import type { AppState } from '../types'
import type { Action } from '../reducer'
import { createDefaultState } from '../persistence'

/** Liest einen exportierten Gartenplan; `null`, wenn der Text kein gültiger Plan ist. */
export function parseImport(text: string): AppState | null {
  try {
    const parsed = JSON.parse(text) as AppState | null
    if (!parsed || !parsed.garden || !Array.isArray(parsed.beds)) return null
    return { ...createDefaultState(), ...parsed }
  } catch {
    return null
  }
}

/** Dateiname für den JSON-Export, abgeleitet aus dem Gartennamen. */
export function exportFileName(gardenName: string): string {
  return `${gardenName.replace(/\s+/g, '-').toLowerCase() || 'gartenplan'}.json`
}

interface ImportExportOptions {
  state: AppState
  dispatch: Dispatch<Action>
  /** Wird nach Import/Reset aufgerufen, um die Editor-Oberfläche zurückzusetzen. */
  onLoaded: () => void
}

/** Export als JSON-Datei, Import aus Datei und Zurücksetzen auf den Standardzustand. */
export function useImportExport({ state, dispatch, onLoaded }: ImportExportOptions) {
  function handleExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName(state.garden.name)
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const imported = parseImport(String(reader.result))
      if (!imported) {
        alert('Import fehlgeschlagen: Die Datei ist kein gültiger Gartenplan.')
        return
      }
      dispatch({ type: 'load', state: imported })
      onLoaded()
    }
    reader.readAsText(file)
  }

  function handleReset() {
    if (window.confirm('Wirklich alles zurücksetzen? Alle Beete und Pflanzen werden gelöscht.')) {
      dispatch({ type: 'load', state: createDefaultState() })
      onLoaded()
    }
  }

  return { handleExport, handleImport, handleReset }
}

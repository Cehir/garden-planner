import { useMemo } from 'react'
import type { ChangeEvent } from 'react'
import type { Phase, Season, Tool } from '../types'
import { PHASE_LABELS, SEASON_LABELS } from '../seasons'
import { useHistory, useStoreState } from '../storeContext'
import { isMac } from '../utils/platform'

/** Was der Plan gerade zeigt */
interface ToolbarView {
  tool: Tool
  zoom: number
  season: Season
  phase: Phase
  showRotation: boolean
  year: number
}

/** Ein Setter je Feld von ToolbarView */
type ToolbarViewHandlers = { [K in keyof ToolbarView]: (value: ToolbarView[K]) => void }

interface ToolbarActions {
  fit: () => void
  print: () => void
  export: () => void
  import: (file: File) => void
  reset: () => void
}

interface ToolbarProps {
  view: ToolbarView
  onView: ToolbarViewHandlers
  actions: ToolbarActions
}

export default function Toolbar({ view, onView, actions }: ToolbarProps) {
  const { tool, zoom, season, phase, showRotation, year } = view
  const state = useStoreState()
  const { undo, redo, canUndo, canRedo } = useHistory()

  const years = useMemo(() => {
    const set = new Set(state.placedPlants.map((p) => p.plantedYear))
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [state.placedPlants])

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      actions.import(file)
      e.target.value = ''
    }
  }

  const undoLabel = isMac ? '⌘Z' : 'Ctrl+Z'
  const redoLabel = isMac ? '⇧⌘Z' : 'Shift+Ctrl+Z'

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          className={tool === 'select' ? 'tool active' : 'tool'}
          onClick={() => onView.tool('select')}
          title="Auswählen / Verschieben (V)"
          aria-label="Auswählen / Verschieben"
        >
          ⤢
        </button>
        <button
          type="button"
          className={tool === 'bed' ? 'tool active' : 'tool'}
          onClick={() => onView.tool('bed')}
          title="Beet zeichnen (B)"
          aria-label="Beet zeichnen"
        >
          ▭
        </button>
        <button
          type="button"
          className={tool === 'plant' ? 'tool active' : 'tool'}
          onClick={() => onView.tool('plant')}
          title="Pflanze platzieren (P)"
          aria-label="Pflanze platzieren"
        >
          🌱
        </button>
      </div>

      <div className="toolbar-info">
        {state.garden.name} · {state.garden.width}×{state.garden.height} cm
      </div>

      <div className="toolbar-group">
        <button type="button" className="tool" onClick={() => onView.zoom(zoom / 1.25)} title="Verkleinern" aria-label="Verkleinern">
          −
        </button>
        <span className="zoom-level" title="Aktueller Zoom">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className="tool" onClick={actions.fit} title="Ansicht anpassen (F)">
          Fit
        </button>
        <button type="button" className="tool" onClick={() => onView.zoom(zoom * 1.25)} title="Vergrößern" aria-label="Vergrößern">
          +
        </button>
      </div>

      <div className="toolbar-group">
        <select
          className="tool select"
          value={year}
          onChange={(e) => onView.year(Number(e.target.value))}
          title="Planungsjahr: Beete zeigen nur Pflanzen dieses Jahres"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="tool select"
          value={season}
          onChange={(e) => onView.season(e.target.value as Season)}
          title="Saison-Filter für den Plan"
        >
          {(Object.keys(SEASON_LABELS) as Season[]).map((s) => (
            <option key={s} value={s}>
              {SEASON_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="tool select"
          value={phase}
          onChange={(e) => onView.phase(e.target.value as Phase)}
          title="Phase: Aussaat, Pflanzung oder Ernte"
        >
          {(Object.keys(PHASE_LABELS) as Phase[]).map((ph) => (
            <option key={ph} value={ph}>
              {PHASE_LABELS[ph]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={showRotation ? 'tool wide active' : 'tool wide'}
          onClick={() => onView.showRotation(!showRotation)}
          title="Pflanzjahre im Plan einblenden (Fruchtfolge)"
        >
          🔁 Fruchtfolge
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className="tool"
          onClick={undo}
          disabled={!canUndo}
          title={`Rückgängig (${undoLabel})`}
          aria-label="Rückgängig"
        >
          ↩
        </button>
        <button
          type="button"
          className="tool"
          onClick={redo}
          disabled={!canRedo}
          title={`Wiederholen (${redoLabel})`}
          aria-label="Wiederholen"
        >
          ↪
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" className="tool wide" onClick={actions.print} title="Garten, Beete und Pflanzen drucken">
          🖨 Drucken
        </button>
        <button type="button" className="tool wide" onClick={actions.export} title="Plan als JSON-Datei speichern">
          💾 Export
        </button>
        <label className="tool wide">
          📂 Import
          <input type="file" accept="application/json,.json" onChange={handleImportFile} hidden />
        </label>
        <span className="toolbar-divider danger-separator" />
        <button
          type="button"
          className="tool wide danger"
          onClick={actions.reset}
          title="Alles zurücksetzen"
        >
          ⚠ Reset
        </button>
      </div>
    </header>
  )
}

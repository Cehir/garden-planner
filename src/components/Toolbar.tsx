import { useMemo } from 'react'
import type { ChangeEvent } from 'react'
import type { Phase, Season, Tool } from '../types'
import { PHASE_LABELS, SEASON_LABELS } from '../seasons'
import { useStore } from '../store'

interface ToolbarProps {
  tool: Tool
  onTool: (t: Tool) => void
  zoom: number
  onZoom: (z: number) => void
  onFit: () => void
  onPrint: () => void
  onExport: () => void
  onImport: (file: File) => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  season: Season
  onSeason: (s: Season) => void
  phase: Phase
  onPhase: (p: Phase) => void
  showRotation: boolean
  onShowRotation: (v: boolean) => void
  year: number
  onYear: (y: number) => void
}

export default function Toolbar({
  tool,
  onTool,
  zoom,
  onZoom,
  onFit,
  onPrint,
  onExport,
  onImport,
  onReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  season,
  onSeason,
  phase,
  onPhase,
  showRotation,
  onShowRotation,
  year,
  onYear,
}: ToolbarProps) {
  const { state } = useStore()

  const years = useMemo(() => {
    const set = new Set(state.placedPlants.map((p) => p.plantedYear))
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [state.placedPlants])

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
      e.target.value = ''
    }
  }

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          className={tool === 'select' ? 'tool active' : 'tool'}
          onClick={() => onTool('select')}
          title="Auswählen / Verschieben (V)"
        >
          ⤢
        </button>
        <button
          type="button"
          className={tool === 'bed' ? 'tool active' : 'tool'}
          onClick={() => onTool('bed')}
          title="Beet zeichnen (B)"
        >
          ▭
        </button>
        <button
          type="button"
          className={tool === 'plant' ? 'tool active' : 'tool'}
          onClick={() => onTool('plant')}
          title="Pflanze platzieren (P)"
        >
          🌱
        </button>
      </div>

      <div className="toolbar-info">
        {state.garden.name} · {state.garden.width}×{state.garden.height} cm
      </div>

      <div className="toolbar-group">
        <button type="button" className="tool" onClick={() => onZoom(zoom / 1.25)} title="Verkleinern">
          −
        </button>
        <span className="zoom-level" title="Aktueller Zoom">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className="tool" onClick={onFit} title="Ansicht anpassen (F)">
          ≡
        </button>
        <button type="button" className="tool" onClick={() => onZoom(zoom * 1.25)} title="Vergrößern">
          +
        </button>
      </div>

      <div className="toolbar-group">
        <select
          className="tool select"
          value={year}
          onChange={(e) => onYear(Number(e.target.value))}
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
          onChange={(e) => onSeason(e.target.value as Season)}
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
          onChange={(e) => onPhase(e.target.value as Phase)}
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
          onClick={() => onShowRotation(!showRotation)}
          title="Pflanzjahre im Plan einblenden (Fruchtfolge)"
        >
          🔁 Fruchtfolge
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className="tool"
          onClick={onUndo}
          disabled={!canUndo}
          title="Rückgängig (⌘Z)"
        >
          ↩
        </button>
        <button
          type="button"
          className="tool"
          onClick={onRedo}
          disabled={!canRedo}
          title="Wiederholen (⇧⌘Z)"
        >
          ↪
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" className="tool wide" onClick={onPrint} title="Garten, Beete und Pflanzen drucken">
          🖨 Drucken
        </button>
        <button type="button" className="tool wide" onClick={onExport} title="Plan als JSON-Datei speichern">
          💾 Export
        </button>
        <label className="tool wide">
          📂 Import
          <input type="file" accept="application/json,.json" onChange={handleImportFile} hidden />
        </label>
        <button
          type="button"
          className="tool wide danger"
          onClick={onReset}
          title="Alles zurücksetzen"
        >
          🗑 Reset
        </button>
      </div>
    </header>
  )
}

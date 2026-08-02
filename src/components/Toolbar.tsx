import type { ChangeEvent } from 'react'
import type { Tool } from '../types'
import { useStore } from '../store'

interface ToolbarProps {
  tool: Tool
  onTool: (t: Tool) => void
  zoom: number
  onZoom: (z: number) => void
  onFit: () => void
  onExport: () => void
  onImport: (file: File) => void
  onReset: () => void
}

export default function Toolbar({
  tool,
  onTool,
  zoom,
  onZoom,
  onFit,
  onExport,
  onImport,
  onReset,
}: ToolbarProps) {
  const { state } = useStore()

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
        <button type="button" className="tool" onClick={onFit} title="Passend (F)">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className="tool" onClick={() => onZoom(zoom * 1.25)} title="Vergrößern">
          +
        </button>
      </div>

      <div className="toolbar-group">
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

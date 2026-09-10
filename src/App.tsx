import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Phase, Plant, Season, Selected, Tool } from './types'
import { StoreProvider, useStore, createDefaultState } from './store'
import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import BedDetails from './components/BedDetails'
import PlantLibrary from './components/PlantLibrary'
import { buildPrintSvg, buildPrintLegend, buildPrintSeedBankHtml, escapeXml } from './printPlan'
import { SEASON_LABELS } from './seasons'
import { isMac } from './utils/platform'
import './App.css'

const PRINT_PAGE_W = 794
const PRINT_PAGE_H = 1123
const PRINT_MARGIN = 48
const PRINT_HEADER_LEGEND_RESERVE = 240

function GardenApp() {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useStore()
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<Selected | null>(null)
  const [placedPlant, setPlacedPlant] = useState<Plant | null>(null)
  const [userZoom, setUserZoom] = useState<number | null>(null)
  const [season, setSeason] = useState<Season>('all')
  const [phase, setPhase] = useState<Phase>('plant')
  const [showRotation, setShowRotation] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [mobileSidebar, setMobileSidebar] = useState<'library' | 'details' | null>(null)

  // "Fit to screen" is derived from the (external) window size + garden
  // dimensions, so it is computed during render instead of stored in state.
  const fitZoom = useMemo(() => {
    const h = Math.max(
      0.15,
      Math.min(3, (window.innerHeight - 190) / state.garden.height),
    )
    const w = Math.max(0.15, Math.min(3, (window.innerWidth - 460) / state.garden.width))
    return Math.min(h, w)
  }, [state.garden.width, state.garden.height])

  const zoom = userZoom ?? fitZoom

  const fit = useCallback(() => setUserZoom(null), [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing && (e.key === 'Delete' || e.key === 'Backspace')) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (!typing) {
          e.preventDefault()
          if (e.shiftKey) redo()
          else undo()
        }
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        if (!typing) {
          e.preventDefault()
          redo()
        }
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selected?.kind === 'bed') {
          dispatch({ type: 'removeBed', id: selected.id })
          setSelected(null)
        } else if (selected?.kind === 'placed') {
          dispatch({ type: 'removePlacedPlant', id: selected.id })
          setSelected(null)
        }
      } else if (e.key === 'Escape') {
        setSelected(null)
        setPlacedPlant(null)
        setTool('select')
      } else if (e.key === 'v' || e.key === 'V') {
        setTool('select')
      } else if (e.key === 'b' || e.key === 'B') {
        setTool('bed')
      } else if (e.key === 'p' || e.key === 'P') {
        setTool('plant')
      } else if (e.key === 'f' || e.key === 'F') {
        fit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, dispatch, fit, undo, redo])

  function setToolSafe(t: Tool) {
    setTool(t)
    if (t !== 'plant') {
      setPlacedPlant(null)
    }
  }

  // Issue #1: picking a plant in the library should immediately arm the plant
  // tool, so the "click to place" hint is truthful from the first click.
  function handlePick(plant: Plant | null) {
    setPlacedPlant(plant)
    if (plant) {
      setTool('plant')
    }
  }

  // Beim Jahreswechsel Auswahl platziertener Pflanzen verwerfen – Beete-Auswahl bleibt gültig.
  function handleYear(y: number) {
    setYear(y)
    setSelected((sel) => (sel?.kind === 'placed' ? null : sel))
  }

  function handlePrint() {
    const garden = state.garden
    const { width, height } = garden
    const scale = Math.min(
      (PRINT_PAGE_W - 2 * PRINT_MARGIN) / width,
      (PRINT_PAGE_H - 2 * PRINT_MARGIN - PRINT_HEADER_LEGEND_RESERVE) / height,
    )
    const svgW = Math.round(width * scale * 100) / 100
    const svgH = Math.round(height * scale * 100) / 100
    const svg = buildPrintSvg(state, { year, season, phase }, { width: svgW, height: svgH })
    const legend = buildPrintLegend(state, year)

    const legendHtml = legend.length
      ? legend
          .map(
            (l) =>
              `<li><span class="lg-emoji">${escapeXml(l.emoji)}</span><span class="lg-name">${escapeXml(l.name)}</span><span class="lg-spacing">${l.spacing} cm</span></li>`,
          )
          .join('')
      : '<li class="muted">Keine Pflanzen im gewählten Jahr.</li>'

    const seasonNote = season !== 'all' ? ` · ${SEASON_LABELS[season]}` : ''
    const title = `${garden.name} – Gartenplan ${year}`
    const seedBankHtml = buildPrintSeedBankHtml(state)
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeXml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 24px; font-family: system-ui, 'Segoe UI', Roboto, sans-serif; color: #3a362e; }
  header { margin-bottom: 16px; }
  h1 { margin: 0 0 4px; font-size: 20px; color: #2f6f4f; }
  .meta { margin: 0; color: #6b6357; font-size: 13px; }
  svg { display: block; max-width: 100%; border: 1px solid #e2dccc; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  h2 { margin: 18px 0 8px; font-size: 15px; color: #2f6f4f; }
  .plan-legend { page-break-inside: avoid; break-inside: avoid; }
  ul.legend { list-style: none; padding: 0; margin: 0; column-width: 120px; column-gap: 16px; }
  ul.legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
  .lg-emoji { font-size: 18px; }
  .lg-spacing { color: #8a8172; }
  .muted { color: #8a8172; font-style: italic; }
  .seedbank { margin-top: 24px; page-break-before: always; break-before: page; }
  .seed-group { margin: 0 0 14px; }
  .seed-group h3 { margin: 0 0 6px; font-size: 14px; color: #3a362e; }
  .seed-emoji { font-size: 18px; margin-right: 8px; }
  table.seed-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.seed-table th, table.seed-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #e2dccc; }
  table.seed-table th { color: #6b6357; font-weight: 600; background: #f6f2e9; }
  @media print { @page { margin: 12mm; } }
</style>
</head>
<body>
<header>
  <h1>${escapeXml(garden.name)}</h1>
  <p class="meta">Maße: ${width} × ${height} cm · Jahr ${year}${seasonNote}</p>
</header>
${svg}
<div class="plan-legend">
<h2>Legende</h2>
<ul class="legend">${legendHtml}</ul>
</div>
${seedBankHtml}
</body>
</html>`

    const w = window.open('', '_blank', 'width=920,height=760')
    if (!w) {
      alert('Drucken fehlgeschlagen: Der Browser hat das Fenster blockiert.')
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
    setTimeout(() => {
      w.focus()
      w.print()
    }, 80)
    w.onafterprint = () => w.close()
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.garden.name.replace(/\s+/g, '-').toLowerCase() || 'gartenplan'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ReturnType<typeof createDefaultState>
        if (!parsed || !parsed.garden || !Array.isArray(parsed.beds)) {
          throw new Error('invalid')
        }
        dispatch({ type: 'load', state: { ...createDefaultState(), ...parsed } })
        setSelected(null)
        setPlacedPlant(null)
        setUserZoom(null)
        setTool('select')
      } catch {
        alert('Import fehlgeschlagen: Die Datei ist kein gültiger Gartenplan.')
      }
    }
    reader.readAsText(file)
  }

  function handleReset() {
    if (window.confirm('Wirklich alles zurücksetzen? Alle Beete und Pflanzen werden gelöscht.')) {
      dispatch({ type: 'load', state: createDefaultState() })
      setSelected(null)
      setPlacedPlant(null)
      setUserZoom(null)
      setTool('select')
    }
  }

  return (
    <div className="app">
      <Toolbar
        tool={tool}
        onTool={setToolSafe}
        zoom={zoom}
        onZoom={(z) => setUserZoom(Math.max(0.1, Math.min(5, z)))}
        onFit={fit}
        onPrint={handlePrint}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        season={season}
        onSeason={setSeason}
        phase={phase}
        onPhase={setPhase}
        showRotation={showRotation}
        onShowRotation={setShowRotation}
        year={year}
        onYear={handleYear}
      />
      <div className="mobile-toggle-bar">
        <button
          className={`tool mobile-toggle ${mobileSidebar === 'library' ? 'active' : ''}`}
          onClick={() => setMobileSidebar(mobileSidebar === 'library' ? null : 'library')}
        >
          🌿 Pflanzen
        </button>
        <button
          className={`tool mobile-toggle ${mobileSidebar === 'details' ? 'active' : ''}`}
          onClick={() => setMobileSidebar(mobileSidebar === 'details' ? null : 'details')}
        >
          📋 Details
        </button>
      </div>
      <div className="mobile-hint">Für die beste Erfahrung öffne diese App auf einem größeren Bildschirm.</div>
      {mobileSidebar && (
        <div className="sidebar-backdrop" onClick={() => setMobileSidebar(null)} />
      )}
      <div className="main">
        <Editor
          tool={tool}
          selected={selected}
          onSelect={setSelected}
          placedPlant={placedPlant}
          zoom={zoom}
          season={season}
          phase={phase}
          showRotation={showRotation}
          year={year}
        />
        {mobileSidebar === 'library' && (
          <div
            className="sidebar mobile-open"
            onClick={(e) => { if (e.target === e.currentTarget) setMobileSidebar(null); }}
          >
            <button className="close-btn" onClick={() => setMobileSidebar(null)}>✕</button>
            <PlantLibrary placedPlant={placedPlant} onPick={handlePick} tool={tool} />
          </div>
        )}
        {mobileSidebar === 'details' && (
          <div
            className="sidebar mobile-open"
            onClick={(e) => { if (e.target === e.currentTarget) setMobileSidebar(null); }}
          >
            <button className="close-btn" onClick={() => setMobileSidebar(null)}>✕</button>
            <BedDetails selected={selected} onClearSelection={() => setSelected(null)} year={year} />
          </div>
        )}
        <PlantLibrary placedPlant={placedPlant} onPick={handlePick} tool={tool} />
        <BedDetails selected={selected} onClearSelection={() => setSelected(null)} year={year} />
      </div>
      <footer className="statusbar">
        {tool === 'bed' && <span>Ziehe mit der Maus, um ein Beet aufzuzeichnen.</span>}
        {tool === 'plant' &&
          (placedPlant
            ? <span>Klicke in ein Beet, um „{placedPlant.name}“ zu platzieren.</span>
            : <span>Wähle links in der Bibliothek eine Pflanze aus.</span>)}
        {tool === 'select' && <span>Auswählen &amp; Verschieben · Beete an den Ecken skalieren · Entf zum Löschen.</span>}
        <span className="keys">Tasten: V · B · P · F · Esc · {isMac ? '⌘Z' : 'Ctrl+Z'} · {isMac ? '⇧⌘Z' : 'Shift+Ctrl+Z'}</span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <GardenApp />
    </StoreProvider>
  )
}

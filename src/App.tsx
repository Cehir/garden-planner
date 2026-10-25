import { useState } from 'react'
import type { Phase, Plant, Season, Selected, Tool } from './types'
import { StoreProvider } from './store'
import { useStore } from './storeContext'
import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import BedDetails from './components/BedDetails'
import PlantLibrary from './components/PlantLibrary'
import { buildPrintDocument, printSvgSize } from './printPlan'
import { isMac } from './utils/platform'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFitZoom } from './hooks/useFitZoom'
import { useImportExport } from './hooks/useImportExport'
import './App.css'

function GardenApp() {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useStore()
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<Selected | null>(null)
  const [plantToPlace, setPlantToPlace] = useState<Plant | null>(null)
  const [season, setSeason] = useState<Season>('all')
  const [phase, setPhase] = useState<Phase>('plant')
  const [showRotation, setShowRotation] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [mobileSidebar, setMobileSidebar] = useState<'library' | 'details' | null>(null)

  const { zoom, setZoom, fit } = useFitZoom(state.garden)

  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onDeleteSelected: () => {
      if (selected?.kind === 'bed') {
        dispatch({ type: 'removeBed', id: selected.id })
        setSelected(null)
      } else if (selected?.kind === 'placed') {
        dispatch({ type: 'removePlacedPlant', id: selected.id })
        setSelected(null)
      }
    },
    onEscape: () => {
      setSelected(null)
      setPlantToPlace(null)
      setTool('select')
    },
    onSelectTool: setTool,
    onFit: fit,
  })

  function setToolSafe(t: Tool) {
    setTool(t)
    if (t !== 'plant') {
      setPlantToPlace(null)
    }
  }

  // Issue #1: picking a plant in the library should immediately arm the plant
  // tool, so the "click to place" hint is truthful from the first click.
  function handlePick(plant: Plant | null) {
    setPlantToPlace(plant)
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
    const html = buildPrintDocument(state, { year, season, phase }, printSvgSize(state.garden))
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

  const { handleExport, handleImport, handleReset } = useImportExport({
    state,
    dispatch,
    onLoaded: () => {
      setSelected(null)
      setPlantToPlace(null)
      fit()
      setTool('select')
    },
  })

  return (
    <div className="app">
      <Toolbar
        tool={tool}
        onTool={setToolSafe}
        zoom={zoom}
        onZoom={setZoom}
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
          plantToPlace={plantToPlace}
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
            <PlantLibrary plantToPlace={plantToPlace} onPick={handlePick} tool={tool} />
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
        <PlantLibrary plantToPlace={plantToPlace} onPick={handlePick} tool={tool} />
        <BedDetails selected={selected} onClearSelection={() => setSelected(null)} year={year} />
      </div>
      <footer className="statusbar">
        {tool === 'bed' && <span>Ziehe mit der Maus, um ein Beet aufzuzeichnen.</span>}
        {tool === 'plant' &&
          (plantToPlace
            ? <span>Klicke in ein Beet, um „{plantToPlace.name}“ zu platzieren.</span>
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

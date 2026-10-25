import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Phase, Plant, Season, Selected, Tool } from './types'
import { StoreProvider } from './store'
import { useStore } from './storeContext'
import { createDefaultState } from './persistence'
import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import BedDetails from './components/BedDetails'
import PlantLibrary from './components/PlantLibrary'
import { buildPrintDocument, printSvgSize } from './printPlan'
import { isMac } from './utils/platform'
import './App.css'

function GardenApp() {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useStore()
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<Selected | null>(null)
  const [plantToPlace, setPlantToPlace] = useState<Plant | null>(null)
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
        setPlantToPlace(null)
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
        setPlantToPlace(null)
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
      setPlantToPlace(null)
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

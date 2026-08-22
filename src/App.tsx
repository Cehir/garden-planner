import { useCallback, useEffect, useState } from 'react'
import type { Phase, Plant, Season, Selected, Tool } from './types'
import { StoreProvider, useStore, createDefaultState } from './store'
import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import BedDetails from './components/BedDetails'
import PlantLibrary from './components/PlantLibrary'
import './App.css'

function GardenApp() {
  const { state, dispatch } = useStore()
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<Selected | null>(null)
  const [placedPlant, setPlacedPlant] = useState<Plant | null>(null)
  const [zoom, setZoom] = useState(0.6)
  const [fitZoom, setFitZoom] = useState(0.6)
  const [season, setSeason] = useState<Season>('all')
  const [phase, setPhase] = useState<Phase>('plant')

  useEffect(() => {
    const h = Math.max(
      0.15,
      Math.min(3, (window.innerHeight - 190) / state.garden.height),
    )
    const w = Math.max(0.15, Math.min(3, (window.innerWidth - 460) / state.garden.width))
    const f = Math.min(h, w)
    setZoom(f)
    setFitZoom(f)
  }, [state.garden.width, state.garden.height])

  const fit = useCallback(() => setZoom(fitZoom), [fitZoom])

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
  }, [selected, dispatch, fit])

  function setToolSafe(t: Tool) {
    setTool(t)
    if (t !== 'plant') {
      setPlacedPlant(null)
    }
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
      setTool('select')
    }
  }

  return (
    <div className="app">
      <Toolbar
        tool={tool}
        onTool={setToolSafe}
        zoom={zoom}
        onZoom={(z) => setZoom(Math.max(0.1, Math.min(5, z)))}
        onFit={fit}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
        season={season}
        onSeason={setSeason}
        phase={phase}
        onPhase={setPhase}
      />
      <div className="main">
        <Editor
          tool={tool}
          selected={selected}
          onSelect={setSelected}
          placedPlant={placedPlant}
          zoom={zoom}
          season={season}
          phase={phase}
        />
        <PlantLibrary placedPlant={placedPlant} onPick={setPlacedPlant} tool={tool} />
        <BedDetails selected={selected} onClearSelection={() => setSelected(null)} />
      </div>
      <footer className="statusbar">
        {tool === 'bed' && <span>Ziehe mit der Maus, um ein Beet aufzuzeichnen.</span>}
        {tool === 'plant' &&
          (placedPlant
            ? <span>Klicke in ein Beet, um „{placedPlant.name}“ zu platzieren.</span>
            : <span>Wähle links in der Bibliothek eine Pflanze aus.</span>)}
        {tool === 'select' && <span>Auswählen &amp; Verschieben · Beete an den Ecken skalieren · Entf zum Löschen.</span>}
        <span className="keys">Tasten: V · B · P · F · Esc</span>
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

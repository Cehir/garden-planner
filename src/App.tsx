import { StoreProvider } from './store'
import { useStore } from './storeContext'
import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import BedDetails from './components/BedDetails'
import PlantLibrary from './components/PlantLibrary'
import MobileSidebar from './components/MobileSidebar'
import StatusBar from './components/StatusBar'
import { buildPrintDocument, printSvgSize } from './printPlan'
import { openPrintWindow } from './printWindow'
import { useEditorUi } from './hooks/useEditorUi'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFitZoom } from './hooks/useFitZoom'
import { useImportExport } from './hooks/useImportExport'
import './App.css'

function GardenApp() {
  const { state, dispatch, undo, redo } = useStore()
  const ui = useEditorUi()
  const { tool, selected, setSelected, plantToPlace, season, phase, showRotation, year, mobileSidebar, setMobileSidebar } = ui
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
    onEscape: ui.resetUi,
    onSelectTool: ui.setTool,
    onFit: fit,
  })

  const { handleExport, handleImport, handleReset } = useImportExport({
    state,
    dispatch,
    onLoaded: () => {
      ui.resetUi()
      fit()
    },
  })

  function handlePrint() {
    openPrintWindow(buildPrintDocument(state, { year, season, phase }, printSvgSize(state.garden)))
  }

  const closeSidebar = () => setMobileSidebar(null)
  const toggleSidebar = (s: 'library' | 'details') => setMobileSidebar(mobileSidebar === s ? null : s)
  const library = <PlantLibrary plantToPlace={plantToPlace} onPick={ui.handlePick} />
  const details = <BedDetails selected={selected} onClearSelection={() => setSelected(null)} year={year} />

  return (
    <div className="app">
      <Toolbar
        view={{ tool, zoom, season, phase, showRotation, year }}
        onView={{
          tool: ui.setToolSafe,
          zoom: setZoom,
          season: ui.setSeason,
          phase: ui.setPhase,
          showRotation: ui.setShowRotation,
          year: ui.handleYear,
        }}
        actions={{ fit, print: handlePrint, export: handleExport, import: handleImport, reset: handleReset }}
      />
      <div className="mobile-toggle-bar">
        <button
          className={`tool mobile-toggle ${mobileSidebar === 'library' ? 'active' : ''}`}
          onClick={() => toggleSidebar('library')}
        >
          🌿 Pflanzen
        </button>
        <button
          className={`tool mobile-toggle ${mobileSidebar === 'details' ? 'active' : ''}`}
          onClick={() => toggleSidebar('details')}
        >
          📋 Details
        </button>
      </div>
      <div className="mobile-hint">Für die beste Erfahrung öffne diese App auf einem größeren Bildschirm.</div>
      {mobileSidebar && <div className="sidebar-backdrop" onClick={closeSidebar} />}
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
        {mobileSidebar === 'library' && <MobileSidebar onClose={closeSidebar}>{library}</MobileSidebar>}
        {mobileSidebar === 'details' && <MobileSidebar onClose={closeSidebar}>{details}</MobileSidebar>}
        {library}
        {details}
      </div>
      <StatusBar tool={tool} plantToPlace={plantToPlace} />
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

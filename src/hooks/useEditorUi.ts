import { useState } from 'react'
import type { Phase, Plant, Season, Selected, Tool } from '../types'

export type MobileSidebar = 'library' | 'details' | null

/** Oberflächen-Zustand des Editors (Werkzeug, Auswahl, Ansichtsfilter), nicht Teil des Plans. */
export function useEditorUi() {
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<Selected | null>(null)
  const [plantToPlace, setPlantToPlace] = useState<Plant | null>(null)
  const [season, setSeason] = useState<Season>('all')
  const [phase, setPhase] = useState<Phase>('plant')
  const [showRotation, setShowRotation] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [mobileSidebar, setMobileSidebar] = useState<MobileSidebar>(null)

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

  /** Auswahl und zu platzierende Pflanze verwerfen, zurück zum Auswahl-Werkzeug. */
  function resetUi() {
    setSelected(null)
    setPlantToPlace(null)
    setTool('select')
  }

  return {
    tool, setTool, setToolSafe,
    selected, setSelected,
    plantToPlace, handlePick,
    season, setSeason,
    phase, setPhase,
    showRotation, setShowRotation,
    year, handleYear,
    mobileSidebar, setMobileSidebar,
    resetUi,
  }
}

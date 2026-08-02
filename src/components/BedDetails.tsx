import type { Selected } from '../types'
import { useStore } from '../store'

const BED_COLORS = ['#7fb069', '#6fa3a8', '#d9a441', '#b0697f', '#8a7bb8', '#d07b4f', '#7b8f4f', '#4f7bb0']

interface BedDetailsProps {
  selected: Selected | null
  onClearSelection: () => void
}

export default function BedDetails({ selected, onClearSelection }: BedDetailsProps) {
  const { state, dispatch } = useStore()

  if (selected?.kind === 'placed') {
    const placed = state.placedPlants.find((p) => p.id === selected.id)
    const plant = placed ? state.plants.find((p) => p.id === placed.plantId) : null
    const bed = placed ? state.beds.find((b) => b.id === placed.bedId) : null
    return (
      <aside className="sidebar">
        <h2>Pflanze</h2>
        <p className="plant-card">
          <span className="emoji">{plant?.emoji ?? '❓'}</span> {plant?.name ?? 'Unbekannt'}
        </p>
        <p>
          Beet: {bed?.name ?? '–'} · Größe: {placed?.size} cm
        </p>
        <button type="button" className="danger" onClick={() => dispatch({ type: 'removePlacedPlant', id: selected.id })}>
          Pflanze entfernen
        </button>
      </aside>
    )
  }

  const bed = selected?.kind === 'bed' ? state.beds.find((b) => b.id === selected.id) : null

  if (!bed) {
    return (
      <aside className="sidebar">
        <h2>Garten</h2>
        <label>
          Name
          <input
            value={state.garden.name}
            onChange={(e) => dispatch({ type: 'setGarden', patch: { name: e.target.value } })}
          />
        </label>
        <label>
          Breite (cm)
          <input
            type="number"
            min={100}
            value={state.garden.width}
            onChange={(e) => dispatch({ type: 'setGarden', patch: { width: Math.max(100, Number(e.target.value) || 100) } })}
          />
        </label>
        <label>
          Höhe (cm)
          <input
            type="number"
            min={100}
            value={state.garden.height}
            onChange={(e) => dispatch({ type: 'setGarden', patch: { height: Math.max(100, Number(e.target.value) || 100) } })}
          />
        </label>
        <p className="hint">
          Wähle oben „▭ Beet zeichnen“ und ziehe mit der Maus ein Rechteck auf.
        </p>
        <p className="hint">
          Mit „🌱 Pflanze platzieren“ klickst du zuerst in der Bibliothek eine Pflanze an und setzt
          sie danach in ein Beet.
        </p>
      </aside>
    )
  }

  const { placedPlants } = state
  const bedPlants = placedPlants.filter((p) => p.bedId === bed.id)
  const totalArea = bed.w * bed.h
  const plantArea = bedPlants.reduce((sum, p) => sum + Math.PI * (p.size / 2) ** 2, 0)
  const utilization = totalArea > 0 ? Math.round((plantArea / totalArea) * 100) : 0

  return (
    <aside className="sidebar">
      <h2>Beet</h2>
      <label>
        Name
        <input value={bed.name} onChange={(e) => dispatch({ type: 'updateBed', id: bed.id, patch: { name: e.target.value } })} />
      </label>
      <label>
        Maße
        <input value={`${bed.w} × ${bed.h} cm (${(bed.w * bed.h / 10000).toFixed(2)} m²)`} readOnly />
      </label>
      <label>
        Position
        <input value={`${bed.x}, ${bed.y} cm`} readOnly />
      </label>
      <label>
        Farbe
        <div className="swatches">
          {BED_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={bed.color === c ? 'swatch active' : 'swatch'}
              style={{ background: c }}
              onClick={() => dispatch({ type: 'updateBed', id: bed.id, patch: { color: c } })}
              aria-label={`Farbe ${c}`}
            />
          ))}
        </div>
      </label>
      <label>
        Notizen
        <textarea
          rows={4}
          placeholder="z.B. sonniger Standort, humusreicher Boden…"
          value={bed.notes}
          onChange={(e) => dispatch({ type: 'updateBed', id: bed.id, patch: { notes: e.target.value } })}
        />
      </label>

      <div className="stats">
        <div>
          <strong>{bedPlants.length}</strong> Pflanzen
        </div>
        <div>
          <strong>{utilization}%</strong> belegt
        </div>
      </div>

      <div className="row">
        <button type="button" className="danger" onClick={() => { dispatch({ type: 'removeBed', id: bed.id }); onClearSelection() }}>
          Beet löschen
        </button>
      </div>
    </aside>
  )
}

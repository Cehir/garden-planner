import type { Selected } from '../types'
import { LIGHT_LABELS, SOIL_LABELS } from '../types'
import { formatRange } from '../seasons'
import { bedCycle, repeatWarnings } from '../rotation'
import { useStore } from '../store'
import { computeConflicts } from '../shadow'
import { placedInYear } from '../utils'

const BED_COLORS = ['#7fb069', '#6fa3a8', '#d9a441', '#b0697f', '#8a7bb8', '#d07b4f', '#7b8f4f', '#4f7bb0']

interface BedDetailsProps {
  selected: Selected | null
  onClearSelection: () => void
  year: number
}

export default function BedDetails({ selected, onClearSelection, year }: BedDetailsProps) {
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
        <label>
          Gepflanzt (Jahr)
          <input
            type="number"
            min={2000}
            max={2100}
            value={placed?.plantedYear ?? new Date().getFullYear()}
            onChange={(e) =>
              dispatch({
                type: 'updatePlacedPlant',
                id: selected.id,
                patch: { plantedYear: Math.max(2000, Math.min(2100, Number(e.target.value) || 2000)) },
              })
            }
          />
        </label>
        <p>
          Optimaler Pflanzabstand: {plant?.spacing ?? 25} cm
          {placed && plant && placed.size !== plant.spacing && ' (Größe abweichend)'}
        </p>
        {plant && (
          <p>
            Höhe: {plant.height ?? 25} cm · Lichtbedarf:{' '}
            {LIGHT_LABELS[plant.light ?? 'full']} · Boden:{' '}
            {SOIL_LABELS[plant.soil ?? 'normal']}
          </p>
        )}
        {plant && (
          <p>
            Anbau: 🌱 Aussaat {formatRange(plant.sow)} · 🪴 Pflanzung{' '}
            {formatRange(plant.plant)} · 🧺 Ernte {formatRange(plant.harvest)}
          </p>
        )}
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
  const yearPlants = placedInYear(placedPlants, year)
  const bedPlants = yearPlants.filter((p) => p.bedId === bed.id)
  const totalArea = bed.w * bed.h
  const plantArea = bedPlants.reduce((sum, p) => sum + Math.PI * (p.size / 2) ** 2, 0)
  const utilization = totalArea > 0 ? Math.round((plantArea / totalArea) * 100) : 0
  const bedPlantIds = new Set(bedPlants.map((p) => p.id))
  const bedConflicts = computeConflicts(yearPlants, state.plants, state.beds).filter(
    (c) => bedPlantIds.has(c.sourceId) || bedPlantIds.has(c.targetId),
  )
  const cycle = bedCycle(state.placedPlants, bed.id)
  const rotationWarnings = repeatWarnings(state.placedPlants, state.plants, bed)

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
          <strong>{bedPlants.length}</strong> Pflanzen · Jahr {year}
        </div>
        <div>
          <strong>{utilization}%</strong> belegt
        </div>
      </div>

      {cycle && (
        <p className="hint">
          🔁 Fruchtfolge: {cycle.min} → {cycle.max} · {cycle.max - cycle.min + 1} Jahr(e)
        </p>
      )}

      {rotationWarnings.length > 0 && (
        <div className="conflicts">
          <h3>🔁 Fruchtfolge-Warnungen</h3>
          <ul>
            {rotationWarnings.map((w, i) => (
              <li key={i}>{w.text}</li>
            ))}
          </ul>
        </div>
      )}

      {bedConflicts.length > 0 && (
        <div className="conflicts">
          <h3>⚠️ Beschattungs-Warnungen</h3>
          <ul>
            {bedConflicts.map((c) => (
              <li key={`${c.sourceId}-${c.targetId}`}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <button type="button" className="danger" onClick={() => { dispatch({ type: 'removeBed', id: bed.id }); onClearSelection() }}>
          Beet löschen
        </button>
      </div>
    </aside>
  )
}

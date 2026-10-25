import { LIGHT_LABELS, SOIL_LABELS } from '../../types'
import { formatRanges } from '../../seasons'
import { useStoreDispatch, useStoreState } from '../../storeContext'

interface PlacedPlantPanelProps {
  placedId: string
}

export default function PlacedPlantPanel({ placedId }: PlacedPlantPanelProps) {
  const state = useStoreState()
  const dispatch = useStoreDispatch()
  const placed = state.placedPlants.find((p) => p.id === placedId)
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
              id: placedId,
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
          Anbau: 🌱 Aussaat {formatRanges(plant.sow)} · 🪴 Pflanzung{' '}
          {formatRanges(plant.plant)} · 🧺 Ernte {formatRanges(plant.harvest)}
        </p>
      )}
      <button type="button" className="danger" onClick={() => dispatch({ type: 'removePlacedPlant', id: placedId })}>
        Pflanze entfernen
      </button>
    </aside>
  )
}

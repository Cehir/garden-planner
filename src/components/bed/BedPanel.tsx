import { useMemo } from 'react'
import type { Bed } from '../../types'
import { bedStats } from '../../bedStats'
import { useStoreDispatch, useStoreState } from '../../storeContext'
import { BED_COLORS, BED_COLOR_NAMES } from '../../palette'
import BedStats from './BedStats'

interface BedPanelProps {
  bed: Bed
  year: number
  onClearSelection: () => void
}

export default function BedPanel({ bed, year, onClearSelection }: BedPanelProps) {
  const { placedPlants, plants, beds } = useStoreState()
  const dispatch = useStoreDispatch()
  const stats = useMemo(
    () => bedStats(placedPlants, plants, beds, bed, year),
    [placedPlants, plants, beds, bed, year],
  )

  return (
    <aside className="sidebar">
      <h2>Beet</h2>
      <label>
        Name
        <input value={bed.name} onChange={(e) => dispatch({ type: 'updateBed', id: bed.id, patch: { name: e.target.value } })} />
      </label>
      <div className="row">
        <label>
          Breite (cm)
          <input
            type="number"
            min={20}
            value={bed.w}
            onChange={(e) => {
              const w = Math.max(20, Number(e.target.value) || 20)
              dispatch({ type: 'updateBed', id: bed.id, patch: { w } })
            }}
          />
        </label>
        <label>
          Höhe (cm)
          <input
            type="number"
            min={20}
            value={bed.h}
            onChange={(e) => {
              const h = Math.max(20, Number(e.target.value) || 20)
              dispatch({ type: 'updateBed', id: bed.id, patch: { h } })
            }}
          />
        </label>
      </div>
      <div className="row">
        <label>
          X (cm)
          <input
            type="number"
            min={0}
            value={bed.x}
            onChange={(e) => {
              const x = Math.max(0, Number(e.target.value) || 0)
              dispatch({ type: 'updateBed', id: bed.id, patch: { x } })
            }}
          />
        </label>
        <label>
          Y (cm)
          <input
            type="number"
            min={0}
            value={bed.y}
            onChange={(e) => {
              const y = Math.max(0, Number(e.target.value) || 0)
              dispatch({ type: 'updateBed', id: bed.id, patch: { y } })
            }}
          />
        </label>
      </div>
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
              aria-label={`Farbe ${BED_COLOR_NAMES[c] ?? c}`}
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

      <BedStats stats={stats} year={year} />

      <div className="row">
        <button type="button" className="danger" onClick={() => { dispatch({ type: 'removeBed', id: bed.id }); onClearSelection() }}>
          Beet löschen
        </button>
      </div>
    </aside>
  )
}

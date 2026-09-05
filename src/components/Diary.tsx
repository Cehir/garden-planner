import { useState } from 'react'
import type { BedAction, DiaryEntry, DiaryTarget, PlantAction } from '../types'
import {
  BED_ACTION_EMOJI,
  BED_ACTION_LABELS,
  PLANT_ACTION_EMOJI,
  PLANT_ACTION_LABELS,
} from '../types'
import { useStore } from '../store'
import { uid } from '../utils'

export default function Diary() {
  const { state, dispatch } = useStore()
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [selectedBeds, setSelectedBeds] = useState<Record<string, BedAction | null>>({})
  const [selectedPlants, setSelectedPlants] = useState<Record<string, PlantAction | null>>({})

  const today = new Date().toISOString().split('T')[0]

  function toggleBed(bedId: string) {
    setSelectedBeds((prev) => {
      const copy = { ...prev }
      if (copy[bedId] !== undefined) {
        delete copy[bedId]
      } else {
        copy[bedId] = null
      }
      return copy
    })
  }

  function setBedAction(bedId: string, action: BedAction) {
    setSelectedBeds((prev) => ({
      ...prev,
      [bedId]: prev[bedId] === action ? null : action,
    }))
  }

  function togglePlant(placedPlantId: string) {
    setSelectedPlants((prev) => {
      const copy = { ...prev }
      if (copy[placedPlantId] !== undefined) {
        delete copy[placedPlantId]
      } else {
        copy[placedPlantId] = null
      }
      return copy
    })
  }

  function setPlantAction(placedPlantId: string, action: PlantAction) {
    setSelectedPlants((prev) => ({
      ...prev,
      [placedPlantId]: prev[placedPlantId] === action ? null : action,
    }))
  }

  function buildTargets(): DiaryTarget[] {
    const targets: DiaryTarget[] = []
    for (const [bedId, action] of Object.entries(selectedBeds)) {
      if (action) {
        targets.push({ kind: 'bed', bedId, action })
      }
    }
    for (const [placedPlantId, action] of Object.entries(selectedPlants)) {
      if (action) {
        targets.push({ kind: 'plant', placedPlantId, action })
      }
    }
    return targets
  }

  function handleSubmit() {
    const targets = buildTargets()
    if (targets.length === 0) return

    const entry: DiaryEntry = {
      id: uid('diary'),
      date,
      timestamp: Date.now(),
      note,
      targets,
    }

    dispatch({ type: 'addDiaryEntry', entry })
    setNote('')
    setSelectedBeds({})
    setSelectedPlants({})
  }

  function handleDelete(id: string) {
    dispatch({ type: 'removeDiaryEntry', id })
  }

  const sortedEntries = [...state.diary].sort((a, b) => b.timestamp - a.timestamp)

  const groupedByDate = sortedEntries.reduce<Record<string, DiaryEntry[]>>((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = []
    }
    acc[entry.date].push(entry)
    return acc
  }, {})

  return (
    <div className="diary">
      <div className="diary-form">
        <h3>Neuer Eintrag</h3>
        <label>
          Datum
          <input
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        {state.beds.length > 0 && (
          <div className="diary-section">
            <strong>Beet-Aktionen</strong>
            {state.beds.map((bed) => (
              <div key={bed.id} className="diary-target-row">
                <label className="diary-checkbox">
                  <input
                    type="checkbox"
                    checked={bed.id in selectedBeds}
                    onChange={() => toggleBed(bed.id)}
                  />
                  {bed.name}
                </label>
                {bed.id in selectedBeds && (
                  <div className="diary-actions">
                    {(Object.keys(BED_ACTION_EMOJI) as BedAction[]).map((action) => (
                      <button
                        key={action}
                        type="button"
                        className={
                          selectedBeds[bed.id] === action
                            ? 'diary-action-btn active'
                            : 'diary-action-btn'
                        }
                        onClick={() => setBedAction(bed.id, action)}
                        title={BED_ACTION_LABELS[action]}
                      >
                        {BED_ACTION_EMOJI[action]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {state.placedPlants.length > 0 && (
          <div className="diary-section">
            <strong>Pflanzen-Aktionen</strong>
            {state.placedPlants.map((placed) => {
              const plant = state.plants.find((p) => p.id === placed.plantId)
              const bed = state.beds.find((b) => b.id === placed.bedId)
              if (!plant) return null
              return (
                <div key={placed.id} className="diary-target-row">
                  <label className="diary-checkbox">
                    <input
                      type="checkbox"
                      checked={placed.id in selectedPlants}
                      onChange={() => togglePlant(placed.id)}
                    />
                    {plant.emoji} {plant.name} ({bed?.name ?? '–'})
                  </label>
                  {placed.id in selectedPlants && (
                    <div className="diary-actions">
                      {(Object.keys(PLANT_ACTION_EMOJI) as PlantAction[]).map((action) => (
                        <button
                          key={action}
                          type="button"
                          className={
                            selectedPlants[placed.id] === action
                              ? 'diary-action-btn active'
                              : 'diary-action-btn'
                          }
                          onClick={() => setPlantAction(placed.id, action)}
                          title={PLANT_ACTION_LABELS[action]}
                        >
                          {PLANT_ACTION_EMOJI[action]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <label>
          Notizen
          <textarea
            rows={3}
            placeholder="Optionale Notizen..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="primary wide"
          onClick={handleSubmit}
          disabled={buildTargets().length === 0}
        >
          Eintrag speichern
        </button>
      </div>

      <div className="diary-list">
        <h3>Vergangene Einträge</h3>
        {sortedEntries.length === 0 && (
          <p className="hint">Noch keine Einträge vorhanden.</p>
        )}
        {Object.entries(groupedByDate).map(([dateStr, entries]) => (
          <div key={dateStr} className="diary-date-group">
            <h4>{new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}</h4>
            {entries.map((entry) => (
              <div key={entry.id} className="diary-entry">
                <div className="diary-entry-targets">
                  {entry.targets.map((target, i) => {
                    if (target.kind === 'bed') {
                      const bed = state.beds.find((b) => b.id === target.bedId)
                      return (
                        <span key={i} className="diary-entry-target">
                          {BED_ACTION_EMOJI[target.action]} {bed?.name ?? '–'} {BED_ACTION_LABELS[target.action]}
                        </span>
                      )
                    } else {
                      const placed = state.placedPlants.find((p) => p.id === target.placedPlantId)
                      const plant = placed ? state.plants.find((p) => p.id === placed.plantId) : null
                      const bed = placed ? state.beds.find((b) => b.id === placed.bedId) : null
                      return (
                        <span key={i} className="diary-entry-target">
                          {PLANT_ACTION_EMOJI[target.action]} {plant?.name ?? '–'} {PLANT_ACTION_LABELS[target.action]}
                          {bed && ` (${bed.name})`}
                        </span>
                      )
                    }
                  })}
                </div>
                {entry.note && <p className="diary-entry-note">"{entry.note}"</p>}
                <button
                  type="button"
                  className="mini danger"
                  onClick={() => handleDelete(entry.id)}
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
